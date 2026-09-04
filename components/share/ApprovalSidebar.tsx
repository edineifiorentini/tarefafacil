import { IconCheck, IconCircle, IconCircleDot } from "@tabler/icons-react";

import { Avatar } from "@/components/ui/Avatar";
import type { PublicSubtask } from "@/lib/share/publicTask";

/**
 * Os três cards de contexto: quem responde, o que foi pedido, o que falta.
 *
 * São Server Components — não têm estado nem evento. Só a prévia e a caixa
 * de decisão precisam rodar no navegador, e manter estes três no servidor
 * é o que evita mandar a página inteira como JavaScript para alguém que
 * abriu um link no celular.
 */

export function ProjectOwnerCard({
  nome,
  avatarUrl,
}: {
  nome: string;
  avatarUrl: string | null;
}) {
  return (
    <section className="ap-card p-4">
      <h2 className="ap-titulo-card mb-3">Responsável pelo projeto</h2>
      <div className="flex items-center gap-3">
        <Avatar name={nome} src={avatarUrl ?? undefined} size="xl" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[length:var(--text-small-size)] font-medium">
            {nome}
          </span>
          {/* "Responsável pelo projeto" e nada além disso. O banco guarda
              `assignee_id`, não cargo — inventar "Diretor de Arte" seria
              escrever na tela uma informação que ninguém cadastrou. */}
          <span className="ap-meta">Responsável pelo projeto</span>
        </div>
      </div>

      {/* Sem "Enviar mensagem": não existe canal seguro para um visitante
          sem conta falar com a equipe. Um botão que abrisse o e-mail
          pessoal do responsável exporia dado que esta página trabalha para
          não expor — e o pedido de ajustes, logo abaixo, já é o caminho
          que chega a ele. Registrado no roadmap. */}
    </section>
  );
}

export function RequestBriefCard({
  descricao,
  entregaveis,
}: {
  descricao: string | null;
  entregaveis: string[];
}) {
  if (!descricao && entregaveis.length === 0) return null;

  return (
    <section className="ap-card p-4">
      <h2 className="ap-titulo-card mb-3">Sobre a solicitação</h2>

      {descricao ? (
        <p className="ap-texto whitespace-pre-wrap">{descricao}</p>
      ) : null}

      {entregaveis.length > 0 ? (
        <>
          <h3
            className="ap-meta mt-4 mb-2 font-medium tracking-wide uppercase"
            id="lista-de-entregaveis"
          >
            O que foi enviado
          </h3>
          <ul
            aria-labelledby="lista-de-entregaveis"
            className="flex flex-col gap-1.5"
          >
            {entregaveis.map((nome) => (
              <li
                key={nome}
                className="ap-texto flex items-start gap-2 break-all"
              >
                <span
                  aria-hidden
                  className="mt-2 h-1 w-1 shrink-0 rounded-full"
                  style={{ background: "var(--ap-tinta-3)" }}
                />
                {nome}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

/**
 * As etapas da demanda.
 *
 * **O TAFLOW guarda etapa como feita ou não feita** (`subtask.completed_at`)
 * — não há "em análise", "em produção" nem "pendente" por etapa. Mostrar
 * esses rótulos aqui seria inventar um estado que ninguém pode mudar nem
 * consultar em outro lugar.
 *
 * O que existe e é verdade: quantas foram concluídas, quais são, e qual é a
 * próxima. A "próxima" é a primeira não concluída — o que dá ao visitante a
 * informação que ele realmente quer ("onde está agora") sem inventar campo.
 *
 * Nada aqui é clicável: o visitante não altera etapa interna.
 */
export function ApprovalStepsCard({ etapas }: { etapas: PublicSubtask[] }) {
  if (etapas.length === 0) return null;

  const feitas = etapas.filter((e) => e.done).length;
  const pct = Math.round((feitas / etapas.length) * 100);
  const proxima = etapas.findIndex((e) => !e.done);

  return (
    <section className="ap-card p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="ap-titulo-card">Etapas da demanda</h2>
        <span className="ap-meta tnum whitespace-nowrap">
          {feitas} de {etapas.length} concluídas
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={feitas}
        aria-valuemin={0}
        aria-valuemax={etapas.length}
        aria-label={`${feitas} de ${etapas.length} etapas concluídas`}
        className="mb-4 h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: "var(--ap-linha)" }}
      >
        <div
          className="h-full rounded-full transition-[width] [transition-duration:var(--dur-slow)]"
          style={{ width: `${pct}%`, background: "var(--ap-lime)" }}
        />
      </div>

      <ol className="flex flex-col">
        {etapas.map((e, i) => {
          const ehProxima = i === proxima;
          const ultima = i === etapas.length - 1;
          const Icone = e.done
            ? IconCheck
            : ehProxima
              ? IconCircleDot
              : IconCircle;

          return (
            <li
              key={i}
              className="relative flex items-start gap-2.5 pb-3 last:pb-0"
            >
              {/* A linha que desce até a próxima etapa. É o que faz isto ler
                  como PERCURSO em vez de escolha: três círculos soltos
                  empilhados são um grupo de radio, e o cliente não está
                  escolhendo etapa nenhuma.

                  Absoluta e ancorada no <li>, e não no marcador: o vão entre
                  as etapas vem do preenchimento interno, e align-self com
                  stretch só alcança a caixa de conteúdo — medido no
                  navegador, a linha nascia com zero de altura. */}
              {ultima ? null : (
                <span
                  aria-hidden
                  className="absolute top-[1.4rem] bottom-0 left-[0.47rem] w-px"
                  style={{
                    background: e.done
                      ? "color-mix(in srgb, var(--ap-lime) 45%, transparent)"
                      : "var(--ap-linha-forte)",
                  }}
                />
              )}

              <Icone
                size={16}
                stroke={e.done ? 2.5 : 1.75}
                aria-hidden
                className="relative mt-0.5 shrink-0"
                style={{
                  color: e.done
                    ? "var(--ap-lime)"
                    : ehProxima
                      ? "var(--ap-tinta)"
                      : "var(--ap-tinta-3)",
                }}
              />
              <span
                className="flex-1 text-[length:var(--text-small-size)]"
                style={{
                  color: e.done
                    ? "var(--ap-tinta-3)"
                    : ehProxima
                      ? "var(--ap-tinta)"
                      : "var(--ap-tinta-2)",
                }}
              >
                {e.title}
              </span>

              {/* O rótulo repete em texto o que o ícone diz. Estado não
                  pode depender só de forma nem só de cor. */}
              <span className="ap-meta shrink-0">
                {e.done ? "Concluída" : ehProxima ? "Em andamento" : "A fazer"}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
