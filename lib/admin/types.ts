import type { Plan } from "@/types/database";

export type ClientRow = {
  id: string;
  name: string;
  plan: Plan;
  seat_limit: number;
  member_count: number;
  owner_email: string | null;
  created_at: string;
};
