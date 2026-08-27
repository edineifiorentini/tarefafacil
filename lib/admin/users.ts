// Módulo Usuários (especificação 10). Só servidor.
//
// Separado de Empresas de propósito: a mesma pessoa pode estar em vários
// workspaces, e a pergunta "esse e-mail existe? entrou quando? em quais
// empresas?" não se responde bem numa lista de empresas.

import { createAdminClient } from "@/lib/supabase/admin";

export type StatusUsuario =
  "ativo" | "pendente_verificacao" | "convidado" | "inativo";

export const STATUS_USUARIO_META: Record<
  StatusUsuario,
  { label: string; tone: string }
> = {
  ativo: { label: "Ativo", tone: "var(--positive)" },
  pendente_verificacao: {
    label: "Pendente de verificação",
    tone: "var(--status-due-soon-fg)",
  },
  convidado: { label: "Convidado", tone: "var(--chart-2)" },
  inativo: { label: "Inativo", tone: "var(--text-muted)" },
};

export type UsuarioResumo = {
  id: string;
  nome: string | null;
  email: string;
  status: StatusUsuario;
  /** Nomes das empresas em que a pessoa é membro ativo. */
  empresas: string[];
  /** Papel na primeira empresa; a lista completa vive no detalhe. */
  papel: string | null;
  /** Como a pessoa entra: senha, Google, ou os dois. */
  autenticacao: string;
  emailVerificado: boolean;
  ultimoAcesso: string | null;
  criadoEm: string;
};

const POR_PAGINA = 50;
const TETO_USUARIOS = 1000;

/**
 * Dados que só a API de autenticação tem: verificação de e-mail, provedores
 * e último login. Não estão em `app_user` — e não devem estar: duplicar
 * estado de autenticação em tabela de aplicação é como as duas versões
 * ficam diferentes.
 */
type DadosDeAuth = {
  emailVerificado: boolean;
  provedores: string[];
  ultimoAcesso: string | null;
};

async function carregarAuth(): Promise<Map<string, DadosDeAuth>> {
  const db = createAdminClient();
  const mapa = new Map<string, DadosDeAuth>();

  for (let pagina = 1; pagina <= TETO_USUARIOS / POR_PAGINA; pagina++) {
    const { data, error } = await db.auth.admin.listUsers({
      page: pagina,
      perPage: POR_PAGINA,
    });
    if (error || !data?.users?.length) break;

    for (const u of data.users) {
      const identidades = (u.identities ?? []).map((i) => i.provider);
      mapa.set(u.id, {
        emailVerificado: !!u.email_confirmed_at,
        provedores: identidades.length > 0 ? identidades : ["email"],
        ultimoAcesso: u.last_sign_in_at ?? null,
      });
    }
    if (data.users.length < POR_PAGINA) break;
  }

  return mapa;
}

function nomeDoProvedor(p: string): string {
  if (p === "google") return "Google";
  if (p === "email") return "Senha";
  return p;
}

/**
 * Status derivado, na mesma ordem de precedência dos estados de empresa:
 * primeiro o que bloqueia, depois o que espera, por último o normal.
 *
 * "Bloqueado", "suspenso" e "excluído logicamente" (especificação 10.2)
 * ficam de fora: não existe coluna que os represente, e derivar um status de
 * bloqueio a partir de outra coisa daria falso negativo justamente no caso
 * em que ele importa.
 */
function statusDoUsuario(
  auth: DadosDeAuth | undefined,
  temEmpresa: boolean,
  temConvitePendente: boolean
): StatusUsuario {
  if (auth && !auth.emailVerificado) return "pendente_verificacao";
  if (!temEmpresa && temConvitePendente) return "convidado";
  if (!temEmpresa) return "inativo";
  return "ativo";
}

export async function listUsers(): Promise<UsuarioResumo[]> {
  const db = createAdminClient();

  const [usuarios, membros, empresas, convites, auth] = await Promise.all([
    db
      .from("app_user")
      .select("id, email, display_name, created_at")
      .order("created_at", { ascending: false }),
    db
      .from("workspace_member")
      .select("workspace_id, user_id, role")
      .eq("status", "active"),
    db.from("workspace").select("id, name"),
    db.from("workspace_invite").select("email").eq("status", "pending"),
    carregarAuth(),
  ]);

  const nomeEmpresa = new Map(
    ((empresas.data ?? []) as { id: string; name: string }[]).map((w) => [
      w.id,
      w.name,
    ])
  );

  const porUsuario = new Map<
    string,
    { empresas: string[]; papel: string | null }
  >();
  for (const m of (membros.data ?? []) as {
    workspace_id: string;
    user_id: string;
    role: string;
  }[]) {
    const atual = porUsuario.get(m.user_id) ?? { empresas: [], papel: null };
    const nome = nomeEmpresa.get(m.workspace_id);
    if (nome) atual.empresas.push(nome);
    atual.papel = atual.papel ?? m.role;
    porUsuario.set(m.user_id, atual);
  }

  const convidados = new Set(
    ((convites.data ?? []) as { email: string | null }[])
      .map((c) => c.email?.toLowerCase())
      .filter((v): v is string => !!v)
  );

  return (
    (usuarios.data ?? []) as {
      id: string;
      email: string;
      display_name: string | null;
      created_at: string;
    }[]
  ).map((u) => {
    const vinculos = porUsuario.get(u.id);
    const dadosAuth = auth.get(u.id);
    return {
      id: u.id,
      nome: u.display_name,
      email: u.email,
      status: statusDoUsuario(
        dadosAuth,
        (vinculos?.empresas.length ?? 0) > 0,
        convidados.has(u.email.toLowerCase())
      ),
      empresas: vinculos?.empresas ?? [],
      papel: vinculos?.papel ?? null,
      autenticacao: (dadosAuth?.provedores ?? ["email"])
        .map(nomeDoProvedor)
        .join(" + "),
      emailVerificado: dadosAuth?.emailVerificado ?? false,
      ultimoAcesso: dadosAuth?.ultimoAcesso ?? null,
      criadoEm: u.created_at,
    };
  });
}
