import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { ProjectView } from "@/components/project/ProjectView";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import { projectStatusLabels } from "@/lib/validation/project";

function fmt(date: string) {
  return format(parseISO(date), "d MMM yyyy", { locale: ptBR });
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("project")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!project) {
    return <div className="text-fg-secondary p-6">Projeto não encontrado.</div>;
  }

  const period =
    project.starts_on && project.ends_on
      ? `${fmt(project.starts_on)} — ${fmt(project.ends_on)}`
      : project.starts_on
        ? `A partir de ${fmt(project.starts_on)}`
        : project.ends_on
          ? `Até ${fmt(project.ends_on)}`
          : null;

  return (
    <div className="mx-auto max-w-[var(--max-width-read)] px-6 py-8">
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* h2: o h1 da página é o título da rota, na barra superior. */}
          <h2 className="text-fg text-[length:var(--text-h2-size)] leading-[var(--text-h2-line)] font-semibold">
            {project.name}
          </h2>
          <Badge variant={project.status === "ativo" ? "brand" : "neutral"}>
            {projectStatusLabels[project.status]}
          </Badge>
        </div>
        {period ? (
          <p className="tnum text-fg-secondary mt-1">{period}</p>
        ) : null}
        {project.description ? (
          <p className="text-fg-secondary mt-2 whitespace-pre-wrap">
            {project.description}
          </p>
        ) : null}
      </div>

      <ProjectView projectId={id} />
    </div>
  );
}
