"use client";

import { IconPlus } from "@tabler/icons-react";
import Link from "next/link";

import { useShell } from "@/components/shell/shell-context";
import { useProjects } from "@/lib/queries/useProjects";
import { useWorkspace } from "@/lib/queries/useWorkspace";

import { ProjectForm } from "./ProjectForm";

export function SectorProjects({ sectorId }: { sectorId: string }) {
  const workspace = useWorkspace();
  const { data: projects = [] } = useProjects(workspace.id, sectorId);
  const { openPanel, closePanel } = useShell();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[length:var(--text-caption-size)] font-medium uppercase tracking-wide text-fg-muted">
        Projetos
      </span>
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/projeto/${project.id}`}
          className="rounded-full border border-line bg-card px-3 py-1 text-[length:var(--text-small-size)] text-fg-secondary transition-colors [transition-duration:var(--dur-fast)] hover:text-fg"
        >
          {project.name}
        </Link>
      ))}
      <button
        type="button"
        onClick={() =>
          openPanel({
            title: "Novo projeto",
            node: (
              <ProjectForm
                mode="create"
                defaultSectorId={sectorId}
                onDone={closePanel}
              />
            ),
          })
        }
        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[length:var(--text-small-size)] text-fg-secondary transition-colors [transition-duration:var(--dur-fast)] hover:bg-sunken hover:text-fg"
      >
        <IconPlus size={14} stroke={1.5} />
        Projeto
      </button>
    </div>
  );
}
