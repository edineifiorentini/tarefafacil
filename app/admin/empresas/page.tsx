import { AdminClients } from "@/components/admin/AdminClients";
import {
  ADMIN_CONTAINER,
  AdminPageHeader,
} from "@/components/admin/shell/AdminPageHeader";

export const metadata = { title: "Empresas · Plataforma" };

export default function AdminEmpresasPage() {
  return (
    <div className={ADMIN_CONTAINER}>
      <AdminPageHeader
        title="Empresas"
        subtitle="Contas cadastradas, plano, assentos e acesso."
      />
      <AdminClients />
    </div>
  );
}
