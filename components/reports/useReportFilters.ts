"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import {
  PERIODO_PADRAO,
  ehChaveDePeriodo,
  resolverPeriodo,
  type ChaveDePeriodo,
  type Periodo,
} from "@/lib/reports/periodo";
import type { OrdemDeSetor } from "@/lib/reports/setores";

/**
 * Os filtros do relatório vivem na URL.
 *
 * Não é enfeite: um relatório é feito para ser mandado para outra pessoa
 * ("olha o setor de Obras nos últimos 90 dias"). Com o estado só em
 * memória, o link manda a tela e não a pergunta, e quem recebe reconstrói
 * os filtros na mão — ou lê os números errados achando que são os certos.
 *
 * Também é o que faz o voltar do navegador funcionar, e o que devolve a
 * mesma tela depois de um F5.
 *
 * `replace` e não `push`: mexer num seletor não é navegar. Com `push`, sair
 * da tela exigiria um toque no voltar para cada filtro tocado.
 */

export type FiltrosDoRelatorio = {
  aba: string;
  periodoChave: ChaveDePeriodo;
  /** Preenchidos só quando `periodoChave === "custom"`. */
  custom: { de: string; ate: string } | undefined;
  sectorIds: string[];
  assigneeIds: string[];
  comparar: boolean;
  ordem: OrdemDeSetor;
  /** Resolvido a partir da chave — o recorte de dias de fato. */
  periodo: Periodo;
};

const ABAS = ["geral", "setor", "equipe"] as const;
const ORDENS: OrdemDeSetor[] = [
  "atencao",
  "volume",
  "entregues",
  "pontualidade",
  "atrasadas",
  "tempo",
];

const DIA = /^\d{4}-\d{2}-\d{2}$/;

export function useReportFilters(agora: Date) {
  const router = useRouter();
  const params = useSearchParams();

  const filtros = useMemo<FiltrosDoRelatorio>(() => {
    const bruto = params.get("periodo") ?? "";
    const periodoChave: ChaveDePeriodo = ehChaveDePeriodo(bruto)
      ? bruto
      : PERIODO_PADRAO;

    const de = params.get("de") ?? "";
    const ate = params.get("ate") ?? "";
    // Só aceita datas com a forma certa. Um `?de=ontem` colado na barra de
    // endereço não pode virar um período silenciosamente torto.
    const custom =
      DIA.test(de) && DIA.test(ate) ? { de, ate } : undefined;

    const aba = params.get("aba") ?? "geral";
    const ordemBruta = params.get("ordem") ?? "";

    const listaDe = (chave: string) =>
      (params.get(chave) ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    return {
      aba: (ABAS as readonly string[]).includes(aba) ? aba : "geral",
      periodoChave,
      custom,
      sectorIds: listaDe("setores"),
      assigneeIds: listaDe("responsaveis"),
      comparar: params.get("comparar") === "1",
      ordem: ORDENS.includes(ordemBruta as OrdemDeSetor)
        ? (ordemBruta as OrdemDeSetor)
        : "atencao",
      periodo: resolverPeriodo(periodoChave, agora, custom),
    };
  }, [params, agora]);

  const alterar = useCallback(
    (mudanca: Partial<Omit<FiltrosDoRelatorio, "periodo">>) => {
      const proximo = new URLSearchParams(params.toString());

      const escrever = (chave: string, valor: string | null) => {
        if (valor === null || valor === "") proximo.delete(chave);
        else proximo.set(chave, valor);
      };

      if (mudanca.aba !== undefined) {
        escrever("aba", mudanca.aba === "geral" ? null : mudanca.aba);
      }
      if (mudanca.periodoChave !== undefined) {
        escrever(
          "periodo",
          mudanca.periodoChave === PERIODO_PADRAO ? null : mudanca.periodoChave
        );
        // Trocar para um período pronto apaga as datas soltas: deixá-las
        // faria a URL dizer duas coisas, e a próxima leitura escolheria uma.
        if (mudanca.periodoChave !== "custom") {
          proximo.delete("de");
          proximo.delete("ate");
        }
      }
      if (mudanca.custom !== undefined) {
        escrever("de", mudanca.custom?.de ?? null);
        escrever("ate", mudanca.custom?.ate ?? null);
      }
      if (mudanca.sectorIds !== undefined) {
        escrever("setores", mudanca.sectorIds.join(","));
      }
      if (mudanca.assigneeIds !== undefined) {
        escrever("responsaveis", mudanca.assigneeIds.join(","));
      }
      if (mudanca.comparar !== undefined) {
        escrever("comparar", mudanca.comparar ? "1" : null);
      }
      if (mudanca.ordem !== undefined) {
        escrever("ordem", mudanca.ordem === "atencao" ? null : mudanca.ordem);
      }

      const busca = proximo.toString();
      router.replace(busca ? `/relatorios?${busca}` : "/relatorios", {
        scroll: false,
      });
    },
    [params, router]
  );

  const limpar = useCallback(() => {
    router.replace("/relatorios", { scroll: false });
  }, [router]);

  const temFiltro =
    filtros.sectorIds.length > 0 ||
    filtros.assigneeIds.length > 0 ||
    filtros.periodoChave !== PERIODO_PADRAO;

  return { filtros, alterar, limpar, temFiltro };
}
