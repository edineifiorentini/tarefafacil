-- =====================================================================
-- TarefaFácil — seed de desenvolvimento
-- Roda como postgres no SQL Editor (ignora RLS). Popula 1 workspace com
-- casos extremos de conteúdo (docs/build.md, E02).
--
-- NOTA: v_uid é um usuário de desenvolvimento (uuid aleatório). O founder
-- logado (E03) tem outro auth.uid(), então NÃO verá estes dados por RLS.
-- Para enxergá-los com o seu login, após signup rode:
--   update public.workspace_member set user_id = auth.uid()
--   where user_id = (select id from public.app_user where email = 'dev@tarefafacil.local');
--   update public.workspace set owner_user_id = auth.uid()
--   where owner_user_id = (select id from public.app_user where email = 'dev@tarefafacil.local');
-- =====================================================================

do $$
declare
  v_ws           uuid := gen_random_uuid();
  v_uid          uuid := gen_random_uuid();
  v_sec_mkt      uuid := gen_random_uuid();
  v_sec_com      uuid := gen_random_uuid();
  v_sec_empty    uuid := gen_random_uuid();
  v_proj_long    uuid := gen_random_uuid();
  v_proj_short   uuid := gen_random_uuid();
  v_tag_urgente  uuid := gen_random_uuid();
  v_tag_cliente  uuid := gen_random_uuid();
  v_task_big     uuid := gen_random_uuid();
  v_task_att     uuid := gen_random_uuid();
  v_col_mkt_todo uuid;
  v_col_mkt_done uuid;
  v_col_com_todo uuid;
  v_col_com_done uuid;
begin
  -- Workspace, usuário dev e membership
  insert into public.workspace (id, name, owner_user_id, plan)
    values (v_ws, 'Meu workspace', v_uid, 'free');
  insert into public.app_user (id, email, display_name)
    values (v_uid, 'dev@tarefafacil.local', 'Dev');
  insert into public.workspace_member (workspace_id, user_id, role)
    values (v_ws, v_uid, 'owner');

  -- Setores (3; "Pessoal" fica vazio — caso extremo)
  insert into public.sector (id, workspace_id, name, color, icon, position) values
    (v_sec_mkt,   v_ws, 'Marketing', 'violeta', 'speakerphone', 0),
    (v_sec_com,   v_ws, 'Comercial', 'azul',    'businessplan', 1),
    (v_sec_empty, v_ws, 'Pessoal',   'grafite', 'user',         2);

  -- Colunas de Kanban padrão (4 por setor)
  insert into public.board_column (workspace_id, sector_id, name, position, is_done_column)
  select v_ws, s.id, c.name, c.pos, c.done
  from (values (v_sec_mkt), (v_sec_com), (v_sec_empty)) as s(id)
  cross join (values
    ('A fazer', 0, false),
    ('Fazendo', 1, false),
    ('Revisão', 2, false),
    ('Concluído', 3, true)
  ) as c(name, pos, done);

  select id into v_col_mkt_todo from public.board_column where sector_id = v_sec_mkt and position = 0;
  select id into v_col_mkt_done from public.board_column where sector_id = v_sec_mkt and position = 3;
  select id into v_col_com_todo from public.board_column where sector_id = v_sec_com and position = 0;
  select id into v_col_com_done from public.board_column where sector_id = v_sec_com and position = 3;

  -- Projetos (um de ~4 meses atravessando semanas)
  insert into public.project (id, workspace_id, sector_id, name, description, starts_on, ends_on, status) values
    (v_proj_long,  v_ws, v_sec_mkt, 'Campanha anual', 'Projeto de 4 meses atravessando quebras de semana', current_date - 30, current_date + 90, 'ativo'),
    (v_proj_short, v_ws, v_sec_com, 'Proposta Q3',    'Projeto curto',                                     current_date,      current_date + 14, 'planejado');

  -- Tags reutilizáveis
  insert into public.tag (id, workspace_id, name, color) values
    (v_tag_urgente, v_ws, 'urgente', 'coral'),
    (v_tag_cliente, v_ws, 'cliente', 'azul');

  -- Tarefa com título de 140 caracteres + 12 subtarefas (uma passa do prazo)
  insert into public.task (id, workspace_id, sector_id, project_id, column_id, title, priority, due_date, position)
    values (v_task_big, v_ws, v_sec_mkt, v_proj_long, v_col_mkt_todo,
      left(repeat('Planejar a campanha completa de fim de ano com todos os canais ', 5), 140),
      'alta', current_date + 2, 1);

  insert into public.subtask (workspace_id, task_id, title, due_date, position)
  select v_ws, v_task_big, 'Etapa ' || g,
         case when g = 12 then current_date + 10 else null end,  -- posterior ao prazo pai (RN-03)
         g
  from generate_series(1, 12) g;

  -- Tarefa atrasada há 30 dias
  insert into public.task (workspace_id, sector_id, column_id, title, priority, due_date, position)
    values (v_ws, v_sec_com, v_col_com_todo, 'Retomar contato com lead frio', 'media', current_date - 30, 2);

  -- Tarefa com horário (evento com hora, não dia inteiro)
  insert into public.task (workspace_id, sector_id, column_id, title, due_date, due_time, priority, position)
    values (v_ws, v_sec_mkt, v_col_mkt_todo, 'Reunião de kickoff', current_date + 1, '14:30', 'media', 3);

  -- Tarefa concluída
  insert into public.task (workspace_id, sector_id, column_id, title, due_date, completed_at, position)
    values (v_ws, v_sec_com, v_col_com_done, 'Enviar orçamento', current_date - 3, now() - interval '1 day', 4);

  -- Tarefa com anexos (arquivo com nome de 80 chars + link) e insight
  insert into public.task (id, workspace_id, sector_id, project_id, column_id, title, priority, due_date, position)
    values (v_task_att, v_ws, v_sec_com, v_proj_short, v_col_com_todo, 'Revisar contrato', 'alta', current_date + 4, 5);

  insert into public.attachment (workspace_id, task_id, kind, storage_key, filename, mime_type, size_bytes, uploaded_by)
    values (v_ws, v_task_att, 'file', v_ws || '/' || v_task_att || '/doc',
      left(repeat('contrato_versao_final_revisado_assinado_', 3), 76) || '.pdf',
      'application/pdf', 234567, v_uid);

  insert into public.attachment (workspace_id, task_id, kind, external_url, filename)
    values (v_ws, v_task_att, 'link', 'https://drive.google.com/file/d/exemplo', 'Planilha no Drive');

  insert into public.insight (workspace_id, task_id, body, author_id)
    values (v_ws, v_task_att, 'Cliente pediu ajuste na cláusula 4.', v_uid);

  -- Tarefas de preenchimento (20) com prazos variados
  insert into public.task (workspace_id, sector_id, project_id, column_id, title, priority, due_date, position)
  select v_ws,
         case when g % 2 = 0 then v_sec_mkt else v_sec_com end,
         case when g % 3 = 0 then v_proj_long else null end,
         case when g % 2 = 0 then v_col_mkt_todo else v_col_com_todo end,
         'Tarefa de exemplo ' || g,
         (array['baixa', 'media', 'alta'])[1 + (g % 3)],
         case when g % 4 = 0 then null else current_date + (g % 7) end,
         10 + g
  from generate_series(1, 20) g;

  -- Aplica tags (reuso): 'urgente' nas atrasadas, 'cliente' na de contrato
  insert into public.task_tag (task_id, tag_id)
  select t.id, v_tag_urgente
  from public.task t
  where t.workspace_id = v_ws and t.due_date < current_date and t.completed_at is null;

  insert into public.task_tag (task_id, tag_id) values (v_task_att, v_tag_cliente);
end $$;
