"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { Tag, type TagColor } from "@/components/ui/Tag";
import { TextInput } from "@/components/ui/TextInput";
import {
  useAddTaskTag,
  useRemoveTaskTag,
  useTaskTags,
} from "@/lib/queries/useTags";
import { useWorkspace } from "@/lib/queries/useWorkspace";

const NAMED: TagColor[] = ["violeta", "azul", "coral", "rosa", "grafite"];

function toTagColor(color: string | null): TagColor {
  return color && (NAMED as string[]).includes(color)
    ? (color as TagColor)
    : "neutral";
}

export function TagSelector({ taskId }: { taskId: string }) {
  const workspace = useWorkspace();
  const { data: tags = [] } = useTaskTags(workspace.id, taskId);
  const add = useAddTaskTag(workspace.id, taskId);
  const remove = useRemoveTaskTag(workspace.id, taskId);
  const [draft, setDraft] = useState("");

  function onAdd(e: FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    add.mutate(trimmed);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Tag
              key={tag.id}
              color={toTagColor(tag.color)}
              onRemove={() => remove.mutate(tag.id)}
            >
              {tag.name}
            </Tag>
          ))}
        </div>
      ) : null}
      <form onSubmit={onAdd}>
        <TextInput
          size="sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Adicionar tag e Enter"
          aria-label="Nova tag"
        />
      </form>
    </div>
  );
}
