"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { MemberRole, WorkspaceInvite } from "@/types/database";

type InviteRole = Exclude<MemberRole, "owner">;

function invitesKey(workspaceId: string) {
  return ["invites", workspaceId] as const;
}

export function useInvites(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: invitesKey(workspaceId),
    queryFn: async (): Promise<WorkspaceInvite[]> => {
      const { data, error } = await supabase
        .from("workspace_invite")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateInvite(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (role: InviteRole): Promise<WorkspaceInvite> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("workspace_invite")
        .insert({ workspace_id: workspaceId, role, invited_by: user?.id ?? null })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: invitesKey(workspaceId) }),
  });
}

export function useRevokeInvite(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workspace_invite")
        .update({ status: "revoked" })
        .eq("id", id);
      if (error) throw error;
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: invitesKey(workspaceId) }),
  });
}

// Aceite do convite (chamado na página /convite/[token]).
export async function acceptInvite(token: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("accept_invite", {
    p_token: token,
  });
  if (error) throw error;
  return data as string;
}
