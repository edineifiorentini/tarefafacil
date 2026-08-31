import { NextResponse } from "next/server";

import { requireUserAndWorkspace } from "@/lib/auth/context";

// Exporta todos os dados do workspace ativo em JSON. Não inclui tokens do
// Google (google_connection). RLS garante que só vêm dados do próprio tenant.
export async function GET() {
  const ctx = await requireUserAndWorkspace();
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { supabase, workspaceId } = ctx;

  const [
    workspace,
    members,
    sectors,
    columns,
    projects,
    tasks,
    subtasks,
    insights,
    attachments,
    tags,
    taskTags,
  ] = await Promise.all([
    supabase.from("workspace").select("*").eq("id", workspaceId).single(),
    supabase
      .from("workspace_member")
      .select("*")
      .eq("workspace_id", workspaceId),
    supabase.from("sector").select("*").eq("workspace_id", workspaceId),
    supabase.from("board_column").select("*").eq("workspace_id", workspaceId),
    supabase.from("project").select("*").eq("workspace_id", workspaceId),
    supabase.from("task").select("*").eq("workspace_id", workspaceId),
    supabase.from("subtask").select("*").eq("workspace_id", workspaceId),
    supabase.from("insight").select("*").eq("workspace_id", workspaceId),
    supabase.from("attachment").select("*").eq("workspace_id", workspaceId),
    supabase.from("tag").select("*").eq("workspace_id", workspaceId),
    supabase.from("task_tag").select("*"),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    workspace: workspace.data,
    members: members.data ?? [],
    sectors: sectors.data ?? [],
    board_columns: columns.data ?? [],
    projects: projects.data ?? [],
    tasks: tasks.data ?? [],
    subtasks: subtasks.data ?? [],
    insights: insights.data ?? [],
    attachments: attachments.data ?? [],
    tags: tags.data ?? [],
    task_tags: taskTags.data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="taflow-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json"`,
    },
  });
}
