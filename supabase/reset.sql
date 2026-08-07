-- =====================================================================
-- TarefaFácil — reset de desenvolvimento
-- Desfaz 0001/0002/0003 e o seed. Use no SQL Editor para recomeçar do zero.
-- CUIDADO: apaga todos os dados do schema public listado.
-- =====================================================================

drop table if exists
  public.task_tag,
  public.attachment,
  public.insight,
  public.subtask,
  public.task,
  public.tag,
  public.project,
  public.board_column,
  public.sector,
  public.workspace_member,
  public.app_user,
  public.workspace
cascade;

drop function if exists public.is_member(uuid);
drop function if exists public.set_updated_at();
