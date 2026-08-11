// Tipos compartilhados entre rota e cliente (sem código de servidor).

import type { GcalStatus } from "@/types/database";

export type GcalStatusResponse = {
  configured: boolean;
  connected: boolean;
  email: string | null;
  status: GcalStatus | null;
};
