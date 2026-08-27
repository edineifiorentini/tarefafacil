import { IconUsers } from "@tabler/icons-react";

import {
  ADMIN_CONTAINER,
  AdminPageHeader,
} from "@/components/admin/shell/AdminPageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusChip } from "@/components/ui/StatusChip";
import { listUsers, STATUS_USUARIO_META } from "@/lib/admin/users";
import { tempoRelativo } from "@/lib/utils/relative-time";

export const metadata = { title: "Usuários · Plataforma" };
export const dynamic = "force-dynamic";

/**
 * Listagem de usuários (especificação 10.1).
 *
 * As ações da 10.4 — reenviar verificação, bloquear, forçar logout,
 * transferir propriedade — ainda não estão aqui: cada uma é uma mutação com
 * confirmação, motivo e auditoria, e entram junto com o perfil detalhado.
 * A leitura já é real e é o que responde "esse e-mail existe? entrou quando?
 * em quais empresas?".
 */
export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const termo = q?.trim().toLowerCase();

  const todos = await listUsers();
  const usuarios = termo
    ? todos.filter(
        (u) =>
          u.email.toLowerCase().includes(termo) ||
          (u.nome?.toLowerCase().includes(termo) ?? false) ||
          u.empresas.some((e) => e.toLowerCase().includes(termo))
      )
    : todos;

  return (
    <div className={ADMIN_CONTAINER}>
      <AdminPageHeader
        title="Usuários"
        subtitle={
          usuarios.length === 1
            ? "1 pessoa com conta na plataforma."
            : `${usuarios.length} pessoas com conta na plataforma.`
        }
      />

      {usuarios.length === 0 ? (
        <EmptyState
          icon={IconUsers}
          title={
            termo ? "Nenhum usuário para esta busca" : "Nenhum usuário ainda"
          }
          description={
            termo
              ? "Tente outro nome, e-mail ou empresa."
              : "As contas aparecem aqui assim que alguém se cadastrar."
          }
        />
      ) : (
        <div className="border-line bg-card overflow-hidden rounded-md border shadow-[var(--shadow-card)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[54rem] border-collapse">
              <caption className="sr-only">
                Usuários da plataforma, do cadastro mais recente ao mais antigo
              </caption>
              <thead>
                <tr className="border-line border-b">
                  {[
                    "Nome",
                    "E-mail",
                    "Status",
                    "Empresas",
                    "Papel",
                    "Autenticação",
                    "Último acesso",
                  ].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="text-fg-muted px-4 py-2.5 text-left text-[length:var(--text-caption-size)] font-medium tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr
                    key={u.id}
                    className="border-line hover:bg-hover border-b last:border-0"
                  >
                    <td className="text-fg px-4 py-3 text-[length:var(--text-small-size)] font-medium">
                      {u.nome ?? "—"}
                    </td>
                    <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                      {u.email}
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip
                        label={STATUS_USUARIO_META[u.status].label}
                        tone={STATUS_USUARIO_META[u.status].tone}
                      />
                    </td>
                    <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                      {u.empresas.length === 0
                        ? "—"
                        : u.empresas.length === 1
                          ? u.empresas[0]
                          : `${u.empresas[0]} +${u.empresas.length - 1}`}
                    </td>
                    <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                      {u.papel ?? "—"}
                    </td>
                    <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                      {u.autenticacao}
                    </td>
                    <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                      {tempoRelativo(u.ultimoAcesso)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
