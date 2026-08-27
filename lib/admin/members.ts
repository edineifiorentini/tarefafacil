// Ações sobre um membro de empresa (especificação 10.4), vistas do painel da
// plataforma.
//
// Mesmo contrato compartilhado de `actions.ts`: o diálogo e o servidor leem a
// MESMA definição, porque duas listas separadas divergem — e a que diverge
// para menos é a do servidor, que é a que vale.
//
// O QUE NÃO ESTÁ AQUI, e não é esquecimento:
//
// - **Forçar logout sem bloquear.** O SDK só expõe `signOut(jwt)`, e o
//   administrador não tem o token da pessoa. Bloquear já derruba a sessão
//   (o GoTrue recusa renovar token de conta bloqueada), então "bloquear" é
//   hoje o caminho honesto para tirar alguém de dentro. Um logout que não
//   bloqueia precisa do endpoint de sessões do GoTrue, chamado na mão.
//
// - **Reenviar verificação de e-mail.** Depende de SMTP configurado no
//   projeto Supabase. Um botão que promete enviar e-mail e não envia é pior
//   do que botão nenhum.

export type AcaoDeMembro =
  | "alterar_papel"
  | "remover"
  | "transferir_propriedade"
  | "bloquear"
  | "desbloquear"
  | "link_de_senha";

export type DefinicaoDeAcaoDeMembro = {
  label: string;
  titulo: string;
  consequencia: string;
  exigeMotivo: boolean;
  destrutiva: boolean;
};

export const ACOES_DE_MEMBRO: Record<AcaoDeMembro, DefinicaoDeAcaoDeMembro> = {
  alterar_papel: {
    label: "Alterar papel",
    titulo: "Alterar o papel do membro",
    consequencia: "Muda o que a pessoa pode fazer dentro da empresa, na hora.",
    exigeMotivo: true,
    destrutiva: false,
  },
  remover: {
    label: "Remover da empresa",
    titulo: "Remover o membro",
    consequencia:
      "A pessoa perde o acesso a esta empresa. A conta de login dela continua existindo, e o que ela criou permanece.",
    exigeMotivo: true,
    destrutiva: true,
  },
  transferir_propriedade: {
    label: "Transferir propriedade",
    titulo: "Transferir a propriedade da empresa",
    consequencia:
      "Esta pessoa passa a ser a dona. O dono atual vira administrador e continua dentro.",
    exigeMotivo: true,
    destrutiva: true,
  },
  bloquear: {
    label: "Bloquear acesso",
    titulo: "Bloquear a conta de login",
    consequencia:
      "A pessoa não entra em NENHUMA empresa, não só nesta — o bloqueio é da conta. A sessão aberta cai na próxima renovação.",
    exigeMotivo: true,
    destrutiva: true,
  },
  desbloquear: {
    label: "Desbloquear acesso",
    titulo: "Desbloquear a conta de login",
    consequencia: "A pessoa volta a conseguir entrar.",
    exigeMotivo: true,
    destrutiva: false,
  },
  link_de_senha: {
    label: "Gerar link de senha",
    titulo: "Gerar link de redefinição de senha",
    consequencia:
      "Gera um link de uso único e mostra na tela. NENHUM e-mail é enviado — você entrega o link à pessoa. Quem tiver o link define a senha da conta, então trate como senha.",
    exigeMotivo: true,
    destrutiva: false,
  },
};

/** Papéis que podem ser atribuídos pelo painel. */
export const PAPEIS_ATRIBUIVEIS = ["admin", "member", "viewer"] as const;
export type PapelAtribuivel = (typeof PAPEIS_ATRIBUIVEIS)[number];

export const PAPEL_LABEL: Record<string, string> = {
  owner: "Dono",
  admin: "Administrador",
  member: "Membro",
  viewer: "Leitor",
};

export function ehAcaoDeMembro(v: unknown): v is AcaoDeMembro {
  return typeof v === "string" && v in ACOES_DE_MEMBRO;
}

export function ehPapelAtribuivel(v: unknown): v is PapelAtribuivel {
  return (
    typeof v === "string" &&
    (PAPEIS_ATRIBUIVEIS as readonly string[]).includes(v)
  );
}

/**
 * Ações que a empresa ficaria quebrada sem dono ao executar.
 *
 * Uma empresa sem dono é um beco: `workspace.owner_user_id` fica órfão, a
 * cobrança perde o responsável e ninguém tem permissão para convidar
 * alguém de volta. A trava é aqui e no servidor.
 */
export function deixariaSemDono(
  acao: AcaoDeMembro,
  papelDoAlvo: string,
  quantidadeDeDonos: number
): boolean {
  if (papelDoAlvo !== "owner") return false;
  if (quantidadeDeDonos > 1) return false;
  return acao === "remover" || acao === "alterar_papel";
}
