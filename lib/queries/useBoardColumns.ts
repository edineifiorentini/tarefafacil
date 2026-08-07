"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

export function useBoardColumns(workspaceId: string, sectorId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["boardColumns", workspaceId, sectorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_column")
        .select("*")
        .eq("sector_id", sectorId)
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}
