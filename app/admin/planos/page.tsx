import { AdminPlans } from "@/components/admin/AdminPlans";
import {
  ADMIN_CONTAINER,
  AdminPageHeader,
} from "@/components/admin/shell/AdminPageHeader";

export const metadata = { title: "Planos · Plataforma" };

export default function AdminPlanosPage() {
  return (
    <div className={ADMIN_CONTAINER}>
      <AdminPageHeader
        title="Planos"
        subtitle="Preço, limite de usuários e visibilidade no cadastro."
      />
      <AdminPlans />
    </div>
  );
}
