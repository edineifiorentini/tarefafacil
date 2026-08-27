import { EmConstrucao } from "@/components/admin/shell/EmConstrucao";
import {
  ADMIN_CONTAINER,
  AdminPageHeader,
} from "@/components/admin/shell/AdminPageHeader";

export const metadata = { title: "Assinaturas · Plataforma" };

export default function AdminAssinaturasPage() {
  return (
    <div className={ADMIN_CONTAINER}>
      <AdminPageHeader
        title="Assinaturas"
        subtitle="Ciclo financeiro das contas."
      />
      <EmConstrucao
        titulo="A gestão de assinaturas"
        conteudo={[
          "Assinaturas ativas, testes, cancelamentos agendados e inadimplentes",
          "Listagem com plano, ciclo, valor, próxima cobrança e método mascarado",
          "Ações financeiras com confirmação, motivo e registro do retorno do provedor",
          "Faturas e eventos do gateway por empresa",
        ]}
        bloqueio="As ações financeiras precisam de idempotência para não cobrar duas vezes quando um clique repetir, e de estados que o schema ainda não separa: cancelamento agendado, período de tolerância e pausa. Os dados de leitura (assinatura, cobranças pagas, plano) já existem e alimentam o MRR da visão geral."
      />
    </div>
  );
}
