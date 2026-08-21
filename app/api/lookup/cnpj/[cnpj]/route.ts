import { NextResponse } from "next/server";

import { isCnpj, onlyDigits, type CnpjResult } from "@/lib/lookup/types";
import { createClient } from "@/lib/supabase/server";

/**
 * Consulta de CNPJ, pelo servidor.
 *
 * Fonte: **minhareceita.org**, que serve os dados abertos da Receita
 * Federal sem chave e sem teto apertado. A BrasilAPI, usada no CEP, foi
 * testada primeiro e responde **403 no endpoint de CNPJ** — está fechada.
 * ReceitaWS (3 consultas por minuto) e CNPJá aberto (5 por minuto) também
 * funcionam e ficam como reserva; trocar é mexer só neste arquivo.
 *
 * **Só mapeamos o que o cadastro usa.** A resposta traz o quadro societário
 * com CPF parcial dos sócios; nada disso entra no sistema. Dado pessoal que
 * não se guarda é dado que não vaza — e nenhum campo do cliente precisa
 * dele.
 *
 * A situação cadastral vai junto de propósito: fechar contrato com CNPJ
 * baixado é o tipo de coisa que só se descobre quando a nota é recusada.
 */

export const revalidate = 604800; // Uma semana: cadastro de empresa muda pouco.

const TIMEOUT_MS = 20_000;

type MinhaReceitaCnpj = {
  cnpj: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  email: string | null;
  ddd_telefone_1: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  descricao_situacao_cadastral: string | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cnpj: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { cnpj } = await params;
  const digits = onlyDigits(cnpj);
  if (!isCnpj(digits)) {
    return NextResponse.json({ error: "cnpj_invalido" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://minhareceita.org/${digits}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate },
    });
    // A fonte devolve 400 para CNPJ que não existe na base, não 404.
    if (res.status === 404 || res.status === 400) {
      return NextResponse.json(
        { error: "cnpj_nao_encontrado" },
        { status: 404 }
      );
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: "servico_indisponivel" },
        { status: 502 }
      );
    }
    const d = (await res.json()) as MinhaReceitaCnpj;
    const saida: CnpjResult = {
      document: onlyDigits(d.cnpj ?? digits),
      name: d.razao_social ?? "",
      fantasyName: d.nome_fantasia || null,
      email: d.email?.toLowerCase() || null,
      phone: d.ddd_telefone_1 || null,
      zipCode: d.cep ? onlyDigits(d.cep) : null,
      street: d.logradouro || null,
      number: d.numero || null,
      complement: d.complemento || null,
      district: d.bairro || null,
      city: d.municipio || null,
      state: d.uf || null,
      status: d.descricao_situacao_cadastral || null,
    };
    return NextResponse.json(saida);
  } catch {
    return NextResponse.json(
      { error: "servico_indisponivel" },
      { status: 502 }
    );
  }
}
