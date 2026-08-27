import { AdminAffiliates } from "@/components/admin/AdminAffiliates";
import {
  ADMIN_CONTAINER,
  AdminPageHeader,
} from "@/components/admin/shell/AdminPageHeader";

export const metadata = { title: "Afiliados · Plataforma" };

export default function AdminAfiliadosPage() {
  return (
    <div className={ADMIN_CONTAINER}>
      <AdminPageHeader
        title="Afiliados"
        subtitle="Indicações, empresas atribuídas e comissão."
      />
      <AdminAffiliates />
    </div>
  );
}
