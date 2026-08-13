import type { Plan } from "@/types/database";

export type ClientRow = {
  id: string;
  name: string;
  plan: Plan;
  seat_limit: number;
  access_expires_at: string | null;
  expired: boolean;
  suspended: boolean;
  member_count: number;
  owner_email: string | null;
  created_at: string;
};
