"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { MemberRole } from "@/types/database";

export type Member = {
  user_id: string;
  role: MemberRole;
  status: "active" | "pending";
  display_name: string | null;
  avatar_url: string | null;
  email: string;
};

function membersKey(workspaceId: string) {
  return ["members", workspaceId] as const;
}

export function useCurrentUserId() {
  const supabase = createClient();
  return useQuery({
    queryKey: ["current-user"],
    staleTime: Infinity,
    queryFn: async (): Promise<string | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
  });
}

export function useMembers(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: membersKey(workspaceId),
    // Mantém o sino de pedidos pendentes vivo sem recarregar a página.
    refetchInterval: 60_000,
    queryFn: async (): Promise<Member[]> => {
      const { data, error } = await supabase
        .from("workspace_member")
        .select("user_id, role, status, app_user(display_name, avatar_url, email)")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      type Row = {
        user_id: string;
        role: MemberRole;
        status: "active" | "pending";
        app_user: {
          display_name: string | null;
          avatar_url: string | null;
          email: string;
        } | null;
      };
      return (data as unknown as Row[]).map((r) => ({
        user_id: r.user_id,
        role: r.role,
        status: r.status,
        display_name: r.app_user?.display_name ?? null,
        avatar_url: r.app_user?.avatar_url ?? null,
        email: r.app_user?.email ?? "",
      }));
    },
  });
}

export function useUpdateMemberRole(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: MemberRole;
    }) => {
      const { error } = await supabase
        .from("workspace_member")
        .update({ role })
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: membersKey(workspaceId) }),
  });
}

// Aprova a entrada de um membro pendente (dono/admin).
export function useApproveMember(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("workspace_member")
        .update({ status: "active" })
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: membersKey(workspaceId) }),
  });
}

export function useRemoveMember(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("workspace_member")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: membersKey(workspaceId) }),
  });
}
