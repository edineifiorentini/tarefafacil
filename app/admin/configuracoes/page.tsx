import { PoliticaDeCadastro } from "@/components/admin/PoliticaDeCadastro";
import { SignupGate } from "@/components/admin/SignupGate";
import { EmConstrucao } from "@/components/admin/shell/EmConstrucao";
import {
  ADMIN_CONTAINER,
  AdminPageHeader,
} from "@/components/admin/shell/AdminPageHeader";

export const metadata = { title: "Configurações · Plataforma" };

export default function AdminConfiguracoesPage() {
  return (
    <div className={ADMIN_CONTAINER}>
      <AdminPageHeader
        title="Configurações"
        subtitle="Política de cadastro, cobrança e segurança da plataforma."
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-fg text-[length:var(--text-h3-size)] font-semibold">
          Cadastros
        </h2>
        <SignupGate />
        <PoliticaDeCadastro />
      </section>

      {/* O que sobrou depois da 0088, e o motivo de cada um.
          A regra desta tela não mudou: campo sem a regra que o respeita
          vira interruptor que não faz nada. O que caiu daqui caiu porque
          ganhou a regra; o que ficou, ficou porque ainda não tem onde ser
          cumprido — e em três casos o lugar nem é este sistema. */}
      <EmConstrucao
        titulo="O que ainda não dá para ajustar aqui"
        conteudo={[
          "Verificação de e-mail, provedores de autenticação aceitos e duração da sessão — são configuração do Supabase Auth, não coluna nossa",
          "Comunicação de inadimplência — não há canal: o projeto não tem envio de e-mail nem WhatsApp",
          "Período de tolerância e regras de cancelamento — vivem na cobrança, que segue em rodada separada",
          "Exigência de 2FA para administradores — não existe segundo fator no sistema; é rodada própria, com cadastro do fator, desafio no login e códigos de recuperação",
        ]}
        bloqueio="Um interruptor aqui para qualquer um destes seria decorativo: quem administra acreditaria nele e o comportamento não mudaria. Cadastro somente por convite não está na lista porque já funciona — com os cadastros fechados acima, quem tem convite pendente continua entrando."
      />
    </div>
  );
}
