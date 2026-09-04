"use client";

import { useCallback, useSyncExternalStore } from "react";

import { estadoParaURL, type EstadoDaLista } from "@/lib/task/list-view";

/**
 * Visualizações salvas — o recorte com nome, para não remontar toda vez.
 *
 * **Onde isto vive, e por que assim.** O projeto NÃO tem tabela de
 * preferências de usuário: procurei antes de escrever. Existe
 * `notification_preference`, que é de notificação, e `platform_setting`,
 * que é do dono do SaaS. Criar uma tabela nova para guardar filtro de tela
 * seria uma migration, uma RLS e uma rota — trabalho desproporcional para
 * uma preferência de interface, e o tipo de decisão que merece o dono
 * junto.
 *
 * Então fica no navegador, e a limitação é declarada aqui e na tela:
 * **a visualização salva não acompanha entre dispositivos.** Quem salvar no
 * computador não a encontra no celular.
 *
 * A chave inclui usuário E workspace. Sem isso, duas pessoas no mesmo
 * computador — o caso comum numa prefeitura, com máquina compartilhada —
 * veriam os recortes uma da outra, e trocar de empresa traria filtros de
 * setores que não existem lá.
 *
 * `useSyncExternalStore` e não `useState` + efeito: o React Compiler proíbe
 * `setState` dentro de efeito, e ler o armazenamento na renderização
 * direto quebraria a hidratação (o servidor não tem `localStorage`). Esta
 * é a forma que o projeto já usa para isso.
 */

export type VisualizacaoSalva = {
  id: string;
  nome: string;
  /** A busca da URL, sem o "?". É o estado inteiro em uma string. */
  busca: string;
};

const ouvintes = new Set<() => void>();

function chave(userId: string, workspaceId: string): string {
  return `taflow:lista:views:${userId}:${workspaceId}`;
}

function ler(k: string): VisualizacaoSalva[] {
  if (typeof window === "undefined") return [];
  try {
    const bruto = window.localStorage.getItem(k);
    if (!bruto) return [];
    const dados: unknown = JSON.parse(bruto);
    if (!Array.isArray(dados)) return [];
    // Valida item a item: o armazenamento é editável pela pessoa, e um
    // objeto torto aqui quebraria a tela inteira na renderização.
    return dados.filter(
      (v): v is VisualizacaoSalva =>
        !!v &&
        typeof v === "object" &&
        typeof (v as VisualizacaoSalva).id === "string" &&
        typeof (v as VisualizacaoSalva).nome === "string" &&
        typeof (v as VisualizacaoSalva).busca === "string"
    );
  } catch {
    return [];
  }
}

// Cache do array por chave: `useSyncExternalStore` compara por identidade,
// e devolver um array novo a cada leitura faria o React re-renderizar sem
// parar.
const cache = new Map<string, { bruto: string; valor: VisualizacaoSalva[] }>();

function lerEstavel(k: string): VisualizacaoSalva[] {
  const bruto =
    typeof window === "undefined" ? "" : (window.localStorage.getItem(k) ?? "");
  const anterior = cache.get(k);
  if (anterior && anterior.bruto === bruto) return anterior.valor;
  const valor = ler(k);
  cache.set(k, { bruto, valor });
  return valor;
}

const VAZIO: VisualizacaoSalva[] = [];

export function useSavedViews(userId: string | undefined, workspaceId: string) {
  const k = userId ? chave(userId, workspaceId) : "";

  const inscrever = useCallback((aoMudar: () => void) => {
    ouvintes.add(aoMudar);
    // `storage` avisa quando OUTRA aba muda a lista. Sem isso, salvar numa
    // aba e olhar na outra mostraria duas verdades.
    const externo = () => aoMudar();
    window.addEventListener("storage", externo);
    return () => {
      ouvintes.delete(aoMudar);
      window.removeEventListener("storage", externo);
    };
  }, []);

  const views = useSyncExternalStore(
    inscrever,
    () => (k ? lerEstavel(k) : VAZIO),
    () => VAZIO
  );

  const gravar = useCallback(
    (proximas: VisualizacaoSalva[]) => {
      if (!k) return;
      try {
        window.localStorage.setItem(k, JSON.stringify(proximas));
      } catch {
        // Modo privado, cota estourada, armazenamento bloqueado. A tela
        // continua funcionando — só não guarda.
      }
      for (const o of ouvintes) o();
    },
    [k]
  );

  const salvar = useCallback(
    (nome: string, estado: EstadoDaLista) => {
      const limpo = nome.trim();
      if (!limpo) return;
      gravar([
        ...views.filter((v) => v.nome !== limpo),
        {
          id: `${Date.now()}`,
          nome: limpo,
          busca: estadoParaURL(estado),
        },
      ]);
    },
    [views, gravar]
  );

  const remover = useCallback(
    (id: string) => gravar(views.filter((v) => v.id !== id)),
    [views, gravar]
  );

  return { views, salvar, remover, disponivel: !!userId };
}
