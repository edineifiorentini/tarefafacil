import { redirect } from "next/navigation";

import { AdminClients } from "@/components/admin/AdminClients";
import { requirePlatformAdmin } from "@/lib/admin/admin";

export default async function AdminPage() {
  const admin = await requirePlatformAdmin();
  if (!admin) redirect("/hoje");
  return <AdminClients />;
}
