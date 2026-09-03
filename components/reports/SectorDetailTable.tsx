"use client";

import { useMemo, useState } from "react";

import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconColumns,
  IconSearch,
  IconSelector,
  IconSortAscending,
  IconSortDescending,
} from "@tabler/icons-react";
import { DropdownMenu } from "radix-ui";

import type { LinhaDeSetor } from "@/lib/reports/setores";

import { formatarDias } from "./formatarDias";
import { SaudeDoSetor } from "./SaudeDoSetor";

/**
 * A tabela de sempre — só que agora ela vem DEPOIS do diagnóstico.
 *
 * A tela antiga começava aqui, e por isso respondia "quais são os números"
 * antes de "o que está errado". Ela continua inteira: é onde se confere
 * linha a linha, se escolhe coluna e se ordena. O que mudou é a ordem de
 * leitura.
 *
 * **A ordenação e a busca valem sobre TODAS as linhas, não sobre a página.**
 * Ordenar só o que está visível é o defeito clássico de tabela paginada — o
 * topo da lista deixa de ser o topo de nada.
 */

type ChaveDeColuna =
  | "criadas"
  | "entregues"
  | "emAndamento"
  | "atrasadas"
  | "pontualidade"
  | "tempo"
  | "risco";

const COLUNAS: { chave: ChaveDeColuna; rotulo: string; numerica: boolean }[] = [
  { chave: "criadas", rotulo: "Criadas", numerica: true },
  { chave: "entregues", rotulo: "Entregues", numerica: true },
  { chave: "emAndamento", rotulo: "Em andamento", numerica: true },
  { chave: "atrasadas", rotulo: "Atrasadas", numerica: true },
  { chave: "pontualidade", rotulo: "No prazo", numerica: true },
  { chave: "tempo", rotulo: "Tempo médio", numerica: true },
  { chave: "risco", rotulo: "Risco", numerica: false },
];

const PADRAO: ChaveDeColuna[] = COLUNAS.map((c) => c.chave);
const POR_PAGINA = 12;

/**
 * O valor de uma célula, para ordenar.
 *
 * Fora do componente porque a ordenação é memoizada: definida dentro, ela
 * teria identidade nova a cada render e a tabela se reordenaria toda vez
 * que qualquer coisa da tela mudasse.
 */
function valorDe(
  l: LinhaDeSetor,
  c: ChaveDeColuna | "setor",
  nomes: Map<string, string>
): string | number | null {
  switch (c) {
    case "setor":
      return nomes.get(l.sectorId) ?? "Setor removido";
    case "criadas":
      return l.ind.criadas;
    case "entregues":
      return l.ind.entregues;
    case "emAndamento":
      return l.emAndamento;
    case "atrasadas":
      return l.ind.atrasadasAgora;
    case "pontualidade":
      return l.pontualidade;
    case "tempo":
      return l.ind.tempoMedioDias;
    case "risco":
      // Crítico primeiro na ordem decrescente: é o que se procura.
      // "Em dia" fica abaixo de saudável — nada vencido não é urgência.
      return { critico: 3, atencao: 2, saudavel: 1, em_dia: 0 }[l.saude.nivel];
  }
}

export function SectorDetailTable({
  linhas,
  nomes,
  cores,
  onSelecionarSetor,
}: {
  linhas: LinhaDeSetor[];
  /**
   * Mapas, e não funções.
   *
   * Uma seta inline no pai muda de identidade a cada render, e a
   * ordenação memoizada abaixo refaria a conta toda vez que qualquer
   * coisa da tela mudasse — inclusive o hover de um cartão. O mapa vem
   * memoizado de lá.
   */
  nomes: Map<string, string>;
  cores: Map<string, string>;
  onSelecionarSetor: (id: string) => void;
}) {
  const [busca, setBusca] = useState("");
  const [visiveis, setVisiveis] = useState<ChaveDeColuna[]>(PADRAO);
  const [ordem, setOrdem] = useState<{
    chave: ChaveDeColuna | "setor";
    desc: boolean;
  }>({ chave: "atrasadas", desc: true });
  const [pagina, setPagina] = useState(0);

  const nomeDoSetor = (id: string) => nomes.get(id) ?? "Setor removido";
  const corDoSetor = (id: string) => cores.get(id) ?? "var(--chart-1)";

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const base = termo
      ? linhas.filter((l) =>
          (nomes.get(l.sectorId) ?? "").toLowerCase().includes(termo)
        )
      : linhas;

    return [...base].sort((a, b) => {
      const va = valorDe(a, ordem.chave, nomes);
      const vb = valorDe(b, ordem.chave, nomes);

      // `null` sempre por último, em qualquer direção: "não sei" não é nem
      // o maior nem o menor valor.
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;

      const cmp =
        typeof va === "string" && typeof vb === "string"
          ? va.localeCompare(vb, "pt-BR")
          : Number(va) - Number(vb);
      return ordem.desc ? -cmp : cmp;
    });
  }, [linhas, busca, ordem, nomes]);

  const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, paginas - 1);
  const visao = filtradas.slice(
    paginaAtual * POR_PAGINA,
    (paginaAtual + 1) * POR_PAGINA
  );

  const mostra = (c: ChaveDeColuna) => visiveis.includes(c);

  function ordenarPor(c: ChaveDeColuna | "setor") {
    setPagina(0);
    setOrdem((o) =>
      o.chave === c ? { chave: c, desc: !o.desc } : { chave: c, desc: true }
    );
  }

  const ariaSort = (c: ChaveDeColuna | "setor") =>
    ordem.chave === c ? (ordem.desc ? "descending" : "ascending") : "none";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative">
          <IconSearch
            size={15}
            stroke={1.75}
            aria-hidden
            className="text-fg-muted pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
          />
          <input
            type="search"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(0);
            }}
            placeholder="Buscar setor…"
            aria-label="Buscar setor"
            className="border-line bg-card text-fg placeholder:text-fg-muted h-9 w-44 rounded-sm border pr-3 pl-8 text-[length:var(--text-small-size)]"
          />
        </div>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger className="border-line bg-card text-fg-secondary hover:border-line-strong inline-flex h-9 items-center gap-2 rounded-sm border px-3 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]">
            <IconColumns size={16} stroke={1.75} aria-hidden />
            Configurar colunas
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="tf-glass border-line z-50 min-w-52 rounded-md border p-1 shadow-[var(--shadow-popover)]"
            >
              {COLUNAS.map((c) => {
                const marcada = mostra(c.chave);
                return (
                  <DropdownMenu.CheckboxItem
                    key={c.chave}
                    checked={marcada}
                    onSelect={(e) => e.preventDefault()}
                    // A última coluna não pode ser desmarcada: uma tabela só
                    // com a coluna "Setor" não é uma tabela.
                    disabled={marcada && visiveis.length === 1}
                    onCheckedChange={(v) =>
                      setVisiveis((atual) =>
                        v === true
                          ? [...atual, c.chave]
                          : atual.filter((x) => x !== c.chave)
                      )
                    }
                    className="text-fg hover:bg-hover flex cursor-default items-center gap-2 rounded-xs px-2 py-1.5 text-[length:var(--text-small-size)] data-[highlighted]:bg-hover outline-none data-[disabled]:opacity-50"
                  >
<span
                  aria-hidden
                  className="border-line flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border"
                  style={{
                    background: marcada ? "var(--brand-600)" : "transparent",
                    borderColor: marcada ? "var(--brand-600)" : undefined,
                  }}
                >
                  {marcada ? (
                    <IconCheck size={11} stroke={3} color="white" />
                  ) : null}
                </span>
                    {c.rotulo}
                  </DropdownMenu.CheckboxItem>
                );
              })}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {filtradas.length === 0 ? (
        <p className="text-fg-secondary py-8 text-center text-[length:var(--text-small-size)]">
          {busca
            ? `Nenhum setor com “${busca}”.`
            : "Nenhum setor teve movimento no período."}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            {/* `relative` NÃO é decoração. A legenda abaixo é `sr-only`,
                que em Tailwind significa `position: absolute` — e `<table>`
                é estático, então ela resolvia contra o bloco inicial da
                PÁGINA, na altura em que a tabela está dentro do `<main>`
                rolado. Medido em 3/set/2026: `<html>` esticava para 3638px
                numa janela de 602 e nascia uma segunda barra de rolagem
                vertical ao lado da barra da casca. Com `relative`, 602. */}
            <table className="relative w-full text-left text-[length:var(--text-small-size)]">
              <caption className="sr-only">
                Detalhamento por setor. {filtradas.length} setores.
              </caption>
              <thead className="text-fg-muted text-[length:var(--text-caption-size)]">
                <tr className="border-line border-b">
                  <Cabecalho
                    rotulo="Setor"
                    ariaSort={ariaSort("setor")}
                    ativo={ordem.chave === "setor"}
                    desc={ordem.desc}
                    onClick={() => ordenarPor("setor")}
                  />
                  {COLUNAS.filter((c) => mostra(c.chave)).map((c) => (
                    <Cabecalho
                      key={c.chave}
                      rotulo={c.rotulo}
                      alinharDireita={c.numerica}
                      ariaSort={ariaSort(c.chave)}
                      ativo={ordem.chave === c.chave}
                      desc={ordem.desc}
                      onClick={() => ordenarPor(c.chave)}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {visao.map((l) => (
                  <tr
                    key={l.sectorId}
                    className="border-line hover:bg-hover border-b transition-colors [transition-duration:var(--dur-fast)] last:border-0"
                  >
                    <th scope="row" className="py-2 pr-3 font-normal">
                      <button
                        type="button"
                        onClick={() => onSelecionarSetor(l.sectorId)}
                        className="flex max-w-52 items-center gap-2 rounded-xs text-left outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                      >
                        <span
                          aria-hidden
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: corDoSetor(l.sectorId) }}
                        />
                        <span className="text-fg truncate">
                          {nomeDoSetor(l.sectorId)}
                        </span>
                      </button>
                    </th>

                    {mostra("criadas") ? (
                      <Numero valor={l.ind.criadas} />
                    ) : null}
                    {mostra("entregues") ? (
                      <Numero valor={l.ind.entregues} />
                    ) : null}
                    {mostra("emAndamento") ? (
                      <Numero valor={l.emAndamento} />
                    ) : null}
                    {mostra("atrasadas") ? (
                      <Numero
                        valor={l.ind.atrasadasAgora}
                        cor={
                          l.ind.atrasadasAgora > 0
                            ? "var(--status-overdue-fg)"
                            : undefined
                        }
                      />
                    ) : null}
                    {mostra("pontualidade") ? (
                      <td className="tnum text-fg-secondary py-2 pr-3 text-right">
                        {l.pontualidade === null ? (
                          <span className="text-fg-muted">—</span>
                        ) : (
                          `${l.pontualidade}%`
                        )}
                      </td>
                    ) : null}
                    {mostra("tempo") ? (
                      <td className="tnum text-fg-secondary py-2 pr-3 text-right whitespace-nowrap">
                        {l.ind.tempoMedioDias === null ? (
                          <span className="text-fg-muted">—</span>
                        ) : (
                          formatarDias(l.ind.tempoMedioDias)
                        )}
                      </td>
                    ) : null}
                    {mostra("risco") ? (
                      <td className="py-2 text-right">
                        <SaudeDoSetor saude={l.saude} />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {paginas > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-fg-muted text-[length:var(--text-caption-size)]">
                {paginaAtual * POR_PAGINA + 1}–
                {Math.min((paginaAtual + 1) * POR_PAGINA, filtradas.length)} de{" "}
                {filtradas.length}
              </p>
              <div className="flex items-center gap-1">
                <BotaoDePagina
                  rotulo="Página anterior"
                  icone={IconChevronLeft}
                  desabilitado={paginaAtual === 0}
                  onClick={() => setPagina(paginaAtual - 1)}
                />
                <BotaoDePagina
                  rotulo="Próxima página"
                  icone={IconChevronRight}
                  desabilitado={paginaAtual >= paginas - 1}
                  onClick={() => setPagina(paginaAtual + 1)}
                />
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function Cabecalho({
  rotulo,
  alinharDireita,
  ariaSort,
  ativo,
  desc,
  onClick,
}: {
  rotulo: string;
  alinharDireita?: boolean;
  ariaSort: "ascending" | "descending" | "none";
  ativo: boolean;
  desc: boolean;
  onClick: () => void;
}) {
  const Icone = !ativo ? IconSelector : desc ? IconSortDescending : IconSortAscending;
  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={`py-2 font-medium ${alinharDireita ? "pr-3 text-right" : "pr-3"}`}
    >
      <button
        type="button"
        onClick={onClick}
        className={`hover:text-fg inline-flex items-center gap-1 rounded-xs outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] ${
          ativo ? "text-fg-secondary" : ""
        } ${alinharDireita ? "flex-row-reverse" : ""}`}
      >
        {rotulo}
        <Icone size={13} stroke={2} aria-hidden />
      </button>
    </th>
  );
}

function Numero({ valor, cor }: { valor: number; cor?: string }) {
  return (
    <td
      className="tnum py-2 pr-3 text-right"
      style={{ color: cor ?? "var(--text-secondary)" }}
    >
      {valor}
    </td>
  );
}

function BotaoDePagina({
  rotulo,
  icone: Icone,
  desabilitado,
  onClick,
}: {
  rotulo: string;
  icone: typeof IconChevronLeft;
  desabilitado: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      disabled={desabilitado}
      onClick={onClick}
      className="border-line text-fg-secondary hover:bg-hover inline-flex h-8 w-8 items-center justify-center rounded-sm border outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:opacity-40"
    >
      <Icone size={16} stroke={1.75} aria-hidden />
    </button>
  );
}
