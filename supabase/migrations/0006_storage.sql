-- =====================================================================
-- TarefaFácil — 0006_storage  (E13)
-- Bucket privado de anexos + RLS por workspace.
-- Caminho do objeto: {workspace_id}/{task_id}/{attachment_id}-{arquivo}
-- então a 1ª pasta do path é o workspace_id — usada na policy.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Só membros do workspace dono (1ª pasta do path) leem/gravam/apagam.
create policy "attachments_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'attachments'
    and public.is_member((((storage.foldername(name))[1]))::uuid)
  );

create policy "attachments_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and public.is_member((((storage.foldername(name))[1]))::uuid)
  );

create policy "attachments_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'attachments'
    and public.is_member((((storage.foldername(name))[1]))::uuid)
  );
