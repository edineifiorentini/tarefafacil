import { NextResponse } from "next/server";

import { isCep, onlyDigits, type CepResult } from "@/lib/lookup/types";
import { createClient } from "@/lib/supabase/server";

/**
 * Consulta de CEP, pelo servidor.
 *
 * Usa a BrasilAPI, que consolida várias fontes dos Correios e não pede
 * chave. Vinte segundos de teto: CEP que demora mais que isso já perdeu a
 * utilidade — a pessoa terminou de digitar o endereço na mão.
 *
 * Exige sessão. Não é dado sigiloso, mas rota aberta de consulta vira proxy
 * de graça para quem quiser raspar a base pelo nosso IP.
 */

export const revalidate = 86400; // CEP praticamente não muda; um dia é folgado.

const TIMEOUT_MS = 20_000;

type BrasilApiCep = {
  cep: string;
  state: string;
  city: string;
  neighborhood: string | null;
  street: string | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cep: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { cep } = await params;
  const digits = onlyDigits(cep);
  if (!isCep(digits)) {
    return NextResponse.json({ error: "cep_invalido" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate },
    });
    if (res.status === 404) {
      return NextResponse.json(
        { error: "cep_nao_encontrado" },
        { status: 404 }
      );
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: "servico_indisponivel" },
        { status: 502 }
      );
    }
    const data = (await res.json()) as BrasilApiCep;
    const saida: CepResult = {
      zipCode: onlyDigits(data.cep),
      street: data.street || null,
      district: data.neighborhood || null,
      city: data.city || null,
      state: data.state || null,
    };
    return NextResponse.json(saida);
  } catch {
    // Serviço fora do ar não pode travar o cadastro: quem chamou mostra o
    // aviso e a pessoa digita o endereço à mão.
    return NextResponse.json(
      { error: "servico_indisponivel" },
      { status: 502 }
    );
  }
}
