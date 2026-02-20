alter table public.tasks
  add constraint tasks_duration_check
  check (duration_seconds > 0 and duration_seconds < 86400);
