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
      </section>

      <EmConstrucao
        titulo="O resto das configurações"
        conteudo={[
          "Duração e plano padrão do teste, assentos iniciais, verificação de e-mail",
          "Provedores de autenticação aceitos e cadastro somente por convite",
          "Período de tolerância, regras de cancelamento e comunicação de inadimplência",
          "Exigência de 2FA para administradores, duração da sessão e retenção da auditoria",
        ]}
        bloqueio="A tabela platform_setting tem uma coluna só — signups_enabled, que é o controle acima. Cada item desta lista é uma coluna nova mais a regra que a respeita no cadastro, na cobrança ou no login; criar os campos antes das regras produziria um painel cheio de interruptores que não fazem nada."
      />
    </div>
  );
}
