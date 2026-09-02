import { TaflowMark } from "@/components/branding/TaflowMark";
import { MarcaIcone } from "@/components/landing/MarcaIcone";
import type { NomeDeIcone } from "@/lib/landing/conteudo";
import { PRODUTO } from "@/lib/landing/conteudo";

/**
 * Os painéis da demonstração de produto.
 *
 * **Só o painel de aprovação está desenhado no Figma** (node 11:34). Os
 * outros cinco existem porque as abas existem, e foram montados com o
 * vocabulário REAL dos módulos do TAFLOW — setor, quadro, lançamento,
 * agenda, equipe, relatório — dentro da mesma casca de três colunas.
 *
 * O que eles deliberadamente NÃO têm: número de faturamento, nome de
 * cliente real, métrica de resultado. Inventar isso numa página de
 * conversão é o tipo de coisa que se descobre na primeira reunião.
 */

/** A casca comum: barra de topo com a marca e o caminho. */
function Casca({
  caminho,
  children,
  acessorio,
}: {
  caminho: string;
  children: React.ReactNode;
  acessorio?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[var(--taflow-border-default)] bg-[var(--taflow-bg-surface)] shadow-[var(--taflow-elev-card)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--taflow-border-default)] px-5 py-4">
        <TaflowMark title="" className="block shrink-0" style={{ height: 18, width: "auto" }} />
        <p className="truncate text-[13px] text-[var(--taflow-text-secondary)]">
          {caminho}
        </p>
        <div className="ml-auto flex items-center gap-2">{acessorio}</div>
      </div>
      {children}
    </div>
  );
}

function Etiqueta({ children, tom = "neutro" }: { children: React.ReactNode; tom?: "neutro" | "acento" }) {
  return (
    <span
      className={`inline-flex h-9 items-center rounded-[10px] px-3 text-[11px] font-semibold ${
        tom === "acento"
          ? "bg-[var(--taflow-bg-accent-soft)] text-[var(--taflow-text-primary)]"
          : "bg-[var(--taflow-bg-subtle)] text-[var(--taflow-text-secondary)]"
      }`}
    >
      {children}
    </span>
  );
}

/** O painel do Figma, em fidelidade. */
function PainelAprovacao() {
  const a = PRODUTO.aprovacao;
  return (
    <Casca
      caminho={a.caminho}
      acessorio={
        <>
          <Etiqueta tom="acento">{a.situacao}</Etiqueta>
          <Etiqueta>{a.compartilhar}</Etiqueta>
        </>
      }
    >
      <div className="grid lg:grid-cols-[224px_minmax(0,1fr)_334px]">
        {/* Versões */}
        <div className="border-b border-[var(--taflow-border-default)] p-5 lg:border-r lg:border-b-0">
          <p className="text-[14px] font-semibold text-[var(--taflow-text-primary)]">
            {a.versoes.titulo}
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {a.versoes.itens.map((v, i) => (
              <li
                key={v.versao}
                className={`rounded-[14px] border p-3.5 ${
                  i === 0
                    ? "border-[var(--taflow-bg-accent)] bg-[var(--taflow-bg-accent-soft)]"
                    : "border-[var(--taflow-border-default)]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-[var(--taflow-text-primary)]">
                    {v.versao}
                  </span>
                  <span className="text-[12px] text-[var(--taflow-text-secondary)]">
                    {v.estado}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-[var(--taflow-text-secondary)]">
                  {v.data}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* Peça */}
        <div className="lp-scan-host relative border-b border-[var(--taflow-border-default)] p-5 lg:border-r lg:border-b-0">
          <p className="text-[12px] text-[var(--taflow-text-secondary)]">
            {a.telaTitulo}
          </p>

          <div className="relative mt-4 overflow-hidden rounded-[18px] bg-[var(--taflow-bg-inverse)] p-7">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/marca/flow-shapes/flow-wave.svg"
              alt=""
              aria-hidden="true"
              width={240}
              height={140}
              className="pointer-events-none absolute -right-6 -bottom-8 w-[240px] opacity-30"
            />
            <p className="relative text-[11px] font-semibold tracking-[0.08em] text-[var(--taflow-bg-accent)]">
              {a.criativo.eyebrow}
            </p>
            <p className="relative mt-4 max-w-[16ch] text-[clamp(24px,3vw,34px)] leading-[1.12] font-bold tracking-[-0.02em] text-[var(--taflow-text-inverse)]">
              {PRODUTO.titulo}
            </p>
            <span className="relative mt-7 inline-flex h-[46px] items-center rounded-[12px] bg-[var(--taflow-bg-accent)] px-4 text-[12px] font-semibold text-[var(--taflow-text-primary)]">
              {a.criativo.selo}
            </span>
            <span className="lp-scanner" />
          </div>

          {/* O pino de comentário do Figma. */}
          <span
            aria-hidden="true"
            className="absolute right-8 bottom-16 grid h-[38px] w-[38px] place-items-center rounded-full bg-[var(--taflow-bg-accent)] text-[13px] font-bold text-[var(--taflow-text-primary)] shadow-[var(--taflow-elev-card)]"
          >
            1
          </span>
        </div>

        {/* Feedback */}
        <div className="p-5">
          <p className="text-[15px] font-semibold text-[var(--taflow-text-primary)]">
            {a.feedback.titulo}
          </p>

          <div className="mt-4 rounded-[14px] border border-[var(--taflow-border-default)] p-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-[var(--taflow-bg-subtle)] text-[11px] font-semibold text-[var(--taflow-text-primary)]"
              >
                {a.feedback.iniciais}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-[var(--taflow-text-primary)]">
                  {a.feedback.autor}
                </p>
                <p className="text-[11px] text-[var(--taflow-text-secondary)]">
                  {a.feedback.quando}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[13px] leading-[20px] text-[var(--taflow-text-secondary)]">
              {a.feedback.comentario}
            </p>
          </div>

          <div className="mt-3 rounded-[14px] border border-[var(--taflow-border-default)] px-4 py-4 text-[13px] text-[var(--taflow-text-secondary)]">
            {a.feedback.responder}
          </div>

          <div className="mt-3 rounded-[14px] bg-[var(--taflow-bg-subtle)] px-4 py-4">
            <p className="text-[13px] font-semibold text-[var(--taflow-text-primary)]">
              {a.feedback.historicoTitulo}
            </p>
            <p className="mt-1.5 text-[12px] leading-[19px] text-[var(--taflow-text-secondary)]">
              {a.feedback.historicoCorpo}
            </p>
          </div>
        </div>
      </div>
    </Casca>
  );
}

/**
 * Os cinco painéis que o Figma não desenha.
 *
 * Cada um mostra a ESTRUTURA do módulo — as colunas de um quadro, as
 * linhas de um lançamento, os blocos de uma agenda — com rótulos, e
 * nada além disso.
 */
type Modulo = {
  caminho: string;
  icone: NomeDeIcone;
  colunas: { titulo: string; itens: string[] }[];
};

const MODULOS: Record<string, Modulo> = {
  demandas: {
    caminho: "Demandas / Quadro / Todos os setores",
    icone: "kanban",
    colunas: [
      { titulo: "A fazer", itens: ["Briefing recebido", "Aguardando material"] },
      { titulo: "Em produção", itens: ["Peça principal", "Vídeo institucional"] },
      { titulo: "Em aprovação", itens: ["Campanha de lançamento"] },
      { titulo: "Concluído", itens: ["Kit de redes", "Relatório mensal"] },
    ],
  },
  financeiro: {
    caminho: "Financeiro / Lançamentos / Este mês",
    icone: "finance",
    colunas: [
      { titulo: "A receber", itens: ["Mensalidade recorrente", "Projeto avulso"] },
      { titulo: "Recebido", itens: ["Contrato assinado", "Segunda parcela"] },
      { titulo: "A pagar", itens: ["Fornecedor de mídia", "Licenças"] },
      { titulo: "Em atraso", itens: ["Cobrança reenviada"] },
    ],
  },
  agenda: {
    caminho: "Agenda / Semana / Sincronizada com o Google",
    icone: "calendar",
    colunas: [
      { titulo: "Segunda", itens: ["Reunião de briefing", "Entrega de peça"] },
      { titulo: "Terça", itens: ["Gravação"] },
      { titulo: "Quarta", itens: ["Revisão com cliente", "Fechamento"] },
      { titulo: "Quinta", itens: ["Planejamento do mês"] },
    ],
  },
  equipe: {
    caminho: "Equipe / Prazos / Por responsável",
    icone: "team",
    colunas: [
      { titulo: "Atrasadas", itens: ["Nenhuma demanda"] },
      { titulo: "Vencem hoje", itens: ["Peça principal"] },
      { titulo: "Próximos 7 dias", itens: ["Vídeo institucional", "Kit de redes"] },
      { titulo: "Sem responsável", itens: ["Solicitação nova"] },
    ],
  },
  chat: {
    caminho: "Chat e relatórios / Por setor",
    icone: "report",
    colunas: [
      { titulo: "Conversas", itens: ["Criação", "Atendimento"] },
      { titulo: "Menções", itens: ["Aprovação pendente"] },
      { titulo: "Relatórios", itens: ["Entregas por setor", "Pontualidade"] },
      { titulo: "Exportar", itens: ["Planilha do período"] },
    ],
  },
};

function PainelModulo({ id }: { id: string }) {
  const modulo = MODULOS[id];
  if (!modulo) return null;

  return (
    <Casca
      caminho={modulo.caminho}
      acessorio={<MarcaIcone nome={modulo.icone} tamanho={28} />}
    >
      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {modulo.colunas.map((coluna) => (
          <div
            key={coluna.titulo}
            className="rounded-[16px] bg-[var(--taflow-bg-subtle)] p-4"
          >
            <p className="text-[12px] font-semibold text-[var(--taflow-text-primary)]">
              {coluna.titulo}
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {coluna.itens.map((item) => (
                <li
                  key={item}
                  className="rounded-[10px] border border-[var(--taflow-border-default)] bg-[var(--taflow-bg-surface)] px-3 py-2.5 text-[12px] text-[var(--taflow-text-secondary)]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Casca>
  );
}

export function ProductTabPanel({ id }: { id: string }) {
  if (id === "aprovacao") return <PainelAprovacao />;
  return <PainelModulo id={id} />;
}
