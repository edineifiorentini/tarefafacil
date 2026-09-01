"use client";

import { useMemo } from "react";

import { IconUsers } from "@tabler/icons-react";

import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  equipeDoRelatorio,
  escopoDe,
  porPessoa,
  tarefasDoEscopo,
} from "@/lib/notifications/escalation";
import { useCurrentUserId, useMembers } from "@/lib/queries/useMembers";
import { useSectors } from "@/lib/queries/useSectors";
import { useTasks } from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";

/**
 * O relatório de prazos da equipe (0082).
 *
 * Existe porque o sistema escalava metade do problema. Em `derive.ts`:
 *
 *   // Prazo que ainda não venceu só interessa a quem vai entregar.
 *   if (!mine) continue;
 *
 * O gestor recebia a tarefa ATRASADA do time e nunca a que estava PARA
 * VENCER — que é justamente a que ainda dá para salvar. Este relatório
 * mostra as duas, por pessoa.
 *
 * **Por pessoa, e não por tarefa.** Foi o formato que o dono pediu, e é o
 * certo: alerta por tarefa no sino vira ruído para quem tem vinte pessoas.
 * Aqui se vê de relance quem está carregando o quê.
 *
 * Uma coisa que este relatório NÃO é: barreira de acesso. A RLS já deixa
 * qualquer membro ler todas as demandas do workspace. O que ele entrega é
 * foco e aviso, não permissão.
 */
export function TeamRiskReport() {
  const workspace = useWorkspace();
  const { data: userId } = useCurrentUserId();
  const { data: members = [] } = useMembers(workspace.id);
  const { data: sectors = [] } = useSectors(workspace.id);
  const { data: tasks = [], isLoading } = useTasks(workspace.id);

  const meuPapel = members.find((m) => m.user_id === userId)?.role;

  const linhas = useMemo(() => {
    if (!userId) return [];
    const escopo = escopoDe(userId, meuPapel, sectors);
    const equipe = equipeDoRelatorio(
      escopo,
      userId,
      members.filter((m) => m.status === "active").map((m) => m.user_id)
    );
    return porPessoa(tarefasDoEscopo(tasks, escopo, userId), { equipe });
  }, [tasks, sectors, userId, meuPapel, members]);

  const nomePorId = useMemo(
    () =>
      new Map(
        members.map((m) => [m.user_id, m.display_name ?? m.email] as const)
      ),
    [members]
  );
  const avatarPorId = useMemo(
    () => new Map(members.map((m) => [m.user_id, m.avatar_url] as const)),
    [members]
  );

  if (isLoading || !userId) return <Skeleton variant="block" className="h-64" />;

  const totalAtrasadas = linhas.reduce((s, l) => s + l.atrasadas, 0);

  if (linhas.length === 0) {
    return (
      <EmptyState
        icon={IconUsers}
        title="Sem equipe para acompanhar"
        description="Convide alguém para a empresa, ou seja definido como gestor de um setor"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-fg-secondary text-[length:var(--text-small-size)]">
        {totalAtrasadas > 0
          ? `${totalAtrasadas} ${totalAtrasadas === 1 ? "demanda atrasada" : "demandas atrasadas"} no que você acompanha. Prazos dos próximos 7 dias.`
          : "Nada atrasado no que você acompanha. Prazos dos próximos 7 dias."}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="text-fg-muted text-[length:var(--text-caption-size)] tracking-wide uppercase">
              <th className="px-3 py-2 font-medium">Pessoa</th>
              <th className="px-3 py-2 text-right font-medium">Atrasadas</th>
              <th className="px-3 py-2 text-right font-medium">Vence hoje</th>
              <th className="px-3 py-2 text-right font-medium">Em breve</th>
              <th className="px-3 py-2 text-right font-medium">Abertas</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              // Numa constante local, para o TypeScript estreitar o tipo:
              // ele não segue a narrowing através de `semDono`.
              const uid = l.userId;
              const semDono = uid === null;
              const nome = semDono ? "Sem responsável" : (nomePorId.get(uid) ?? "—");
              return (
                <tr
                  key={l.userId ?? "__sem__"}
                  className="border-line border-b last:border-0"
                >
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      {semDono ? null : (
                        <Avatar
                          name={nome}
                          src={(uid ? avatarPorId.get(uid) : null) ?? undefined}
                          size="sm"
                        />
                      )}
                      <span
                        className={
                          semDono
                            ? "text-fg-secondary text-[length:var(--text-small-size)] italic"
                            : "text-fg text-[length:var(--text-small-size)]"
                        }
                      >
                        {nome}
                      </span>
                    </span>
                  </td>
                  {/* Atrasada é a única em cor de alerta. Pintar as três
                      faria a coluna que importa parar de saltar. */}
                  <td
                    className="px-3 py-2 text-right text-[length:var(--text-small-size)] font-medium tabular-nums"
                    style={{
                      color:
                        l.atrasadas > 0 ? "var(--negative)" : "var(--text-muted)",
                    }}
                  >
                    {l.atrasadas}
                  </td>
                  <td className="text-fg-secondary px-3 py-2 text-right text-[length:var(--text-small-size)] tabular-nums">
                    {l.venceHoje}
                  </td>
                  <td className="text-fg-secondary px-3 py-2 text-right text-[length:var(--text-small-size)] tabular-nums">
                    {l.venceEmBreve}
                  </td>
                  {/* Zero aqui é o caso que motivou a coluna: pessoa sem
                      nada atribuído. Fica dito por extenso em vez de um "0"
                      que se confunde com "em dia". */}
                  <td className="px-3 py-2 text-right text-[length:var(--text-small-size)] tabular-nums">
                    {l.abertas === 0 ? (
                      <span className="text-fg-muted italic">sem demanda</span>
                    ) : (
                      <span className="text-fg-secondary">{l.abertas}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
