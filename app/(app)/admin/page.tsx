import { redirect } from "next/navigation";

import { AdminAffiliates } from "@/components/admin/AdminAffiliates";
import { AdminClients } from "@/components/admin/AdminClients";
import { AdminPlans } from "@/components/admin/AdminPlans";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { requirePlatformAdmin } from "@/lib/admin/admin";

export default async function AdminPage() {
  const admin = await requirePlatformAdmin();
  if (!admin) redirect("/hoje");
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-8">
      <Tabs defaultValue="empresas">
        <TabsList>
          <TabsTrigger value="empresas">Empresas</TabsTrigger>
          <TabsTrigger value="planos">Planos</TabsTrigger>
          <TabsTrigger value="afiliados">Afiliados</TabsTrigger>
        </TabsList>
        <TabsContent value="empresas">
          <AdminClients />
        </TabsContent>
        <TabsContent value="planos">
          <AdminPlans />
        </TabsContent>
        <TabsContent value="afiliados">
          <AdminAffiliates />
        </TabsContent>
      </Tabs>
    </div>
  );
}
