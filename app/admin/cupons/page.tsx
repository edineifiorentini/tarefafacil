import { EmConstrucao } from "@/components/admin/shell/EmConstrucao";
import {
  ADMIN_CONTAINER,
  AdminPageHeader,
} from "@/components/admin/shell/AdminPageHeader";

export const metadata = { title: "Cupons · Plataforma" };

export default function AdminCuponsPage() {
  return (
    <div className={ADMIN_CONTAINER}>
      <AdminPageHeader
        title="Cupons"
        subtitle="Campanhas promocionais e descontos."
      />
      <EmConstrucao
        titulo="A gestão de cupons"
        conteudo={[
          "Código, desconto percentual ou fixo e duração",
          "Planos elegíveis, validade, limite total e por cliente",
          "Somente novos clientes e valor mínimo",
          "Quantas vezes foi usado e quanta receita influenciou",
        ]}
        bloqueio="Não existe tabela de cupons no banco, e ela precisa nascer junto com a regra de aplicação na cobrança — cupom que o painel cria mas o checkout ignora é pior do que cupom nenhum."
      />
    </div>
  );
}
