// Filtros da listagem de empresas (especificação 9.4).
//
// Função pura, separada da leitura do banco, por dois motivos: dá para
// testar cada regra sem subir nada, e é o mesmo código que os alertas da
// visão geral acionam por URL.
//
// CONTEXTO: os seis alertas de "Saúde da operação" já linkavam para cá com
// `?status=teste&vencendo=1` e semelhantes — e a página ignorava tudo.
// Clicar em "Testes vencendo 2" abria a lista inteira. Este arquivo é o que
// faz aqueles links dizerem a verdade.

import type { EmpresaResumo } from "./companies";
import type { StatusEmpresa } from "./status";

/** Dias sem alteração de demanda para a conta contar como parada. */
export const DIAS_SEM_ATIVIDADE = 30;

/** Janela em que um teste conta como "vencendo". */
export const DIAS_TESTE_VENCENDO = 7;

/** Fração dos assentos a partir da qual a conta entra no alerta. */
export const FRACAO_LIMITE = 0.8;

export type FiltrosDeEmpresa = {
  /** Busca por nome da empresa ou e-mail do responsável. */
  q?: string;
  status?: StatusEmpresa;
  /** Só testes que terminam nos próximos dias. */
  vencendo?: boolean;
  /** "parada" = sem alteração de demanda na janela. */
  atividade?: "parada";
  /** "limite" = perto ou acima do limite de assentos. */
  assentos?: "limite";
  /** "expirados" = tem convite pendente vencido. */
  convites?: "expirados";
};

function normalizar(s: string): string {
  // Sem acento e sem caixa: procurar "servico" precisa achar "Serviço".
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function filtrarEmpresas(
  empresas: EmpresaResumo[],
  filtros: FiltrosDeEmpresa,
  agora = Date.now()
): EmpresaResumo[] {
  const termo = filtros.q?.trim() ? normalizar(filtros.q.trim()) : null;

  return empresas.filter((e) => {
    if (termo) {
      const alvo = normalizar(
        `${e.nome} ${e.responsavel ?? ""} ${e.planoNome ?? ""}`
      );
      if (!alvo.includes(termo)) return false;
    }

    if (filtros.status && e.status !== filtros.status) return false;

    if (filtros.vencendo) {
      // "Vencendo" só faz sentido para quem ainda está em teste: um teste que
      // já acabou não está vencendo, acabou.
      if (!e.emTeste || !e.fimDoTeste) return false;
      const t = new Date(e.fimDoTeste).getTime();
      if (t < agora || t > agora + DIAS_TESTE_VENCENDO * 86_400_000) {
        return false;
      }
    }

    if (filtros.atividade === "parada") {
      const limite = agora - DIAS_SEM_ATIVIDADE * 86_400_000;
      // Empresa que NUNCA teve atividade também está parada — e é o caso mais
      // interessante, porque é alguém que se cadastrou e não usou.
      if (
        e.ultimaAtividade &&
        new Date(e.ultimaAtividade).getTime() >= limite
      ) {
        return false;
      }
    }

    if (filtros.assentos === "limite") {
      if (e.seatLimit <= 0) return false;
      if (e.membros < e.seatLimit * FRACAO_LIMITE) return false;
    }

    if (filtros.convites === "expirados" && e.convitesExpirados === 0) {
      return false;
    }

    return true;
  });
}

/** Chips removíveis do que está filtrado (especificação 9.4). */
export function chipsDeFiltro(
  filtros: FiltrosDeEmpresa,
  rotuloDeStatus: (s: StatusEmpresa) => string
): { chave: string; label: string }[] {
  const chips: { chave: string; label: string }[] = [];
  if (filtros.q) chips.push({ chave: "q", label: `"${filtros.q}"` });
  if (filtros.status) {
    chips.push({ chave: "status", label: rotuloDeStatus(filtros.status) });
  }
  if (filtros.vencendo) {
    chips.push({ chave: "vencendo", label: "Teste vencendo" });
  }
  if (filtros.atividade === "parada") {
    chips.push({ chave: "atividade", label: "Sem atividade" });
  }
  if (filtros.assentos === "limite") {
    chips.push({ chave: "assentos", label: "No limite de assentos" });
  }
  if (filtros.convites === "expirados") {
    chips.push({ chave: "convites", label: "Convite expirado" });
  }
  return chips;
}
