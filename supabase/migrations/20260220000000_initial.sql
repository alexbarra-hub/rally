-- ============================================================
-- Rally — Initial Schema Migration
-- Run this in your Supabase SQL editor or via Supabase CLI
-- ============================================================

-- gen_random_uuid() is built-in since PostgreSQL 13, no extension needed

-- ── profiles ────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null,
  avatar_url  text,
  location    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── task_types ───────────────────────────────────────────────
create table public.task_types (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  icon       text not null,
  created_at timestamptz not null default now()
);

alter table public.task_types enable row level security;

create policy "Task types are viewable by everyone"
  on public.task_types for select using (true);

-- Seed default task types
insert into public.task_types (name, icon) values
  ('Dishes',        '🍽️'),
  ('Laundry',       '👕'),
  ('Vacuuming',     '🧹'),
  ('Trash',         '🗑️'),
  ('Groceries',     '🛒'),
  ('Cooking',       '🍳'),
  ('Bathroom',      '🚿'),
  ('Bed Making',    '🛏️'),
  ('Mopping',       '🪣'),
  ('Decluttering',  '📦');

-- ── tasks ────────────────────────────────────────────────────
create table public.tasks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  task_type_id     uuid not null references public.task_types(id) on delete cascade,
  duration_seconds integer not null,
  photo_url        text,
  completed_at     timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "Tasks are viewable by everyone"
  on public.tasks for select using (true);

create policy "Users can insert own tasks"
  on public.tasks for insert with check (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on public.tasks for delete using (auth.uid() = user_id);

-- ── task_likes ───────────────────────────────────────────────
create table public.task_likes (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks(id) on delete cascade,
  user_id    uuid not null,
  created_at timestamptz not null default now(),
  unique (task_id, user_id)
);

alter table public.task_likes enable row level security;

create policy "Likes are viewable by everyone"
  on public.task_likes for select using (true);

create policy "Users can like tasks"
  on public.task_likes for insert with check (auth.uid() = user_id);

create policy "Users can unlike tasks"
  on public.task_likes for delete using (auth.uid() = user_id);

-- ── user_relationships ───────────────────────────────────────
create table public.user_relationships (
  id           uuid primary key default gen_random_uuid(),
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (follower_id, following_id)
);

alter table public.user_relationships enable row level security;

create policy "Relationships are viewable by everyone"
  on public.user_relationships for select using (true);

create policy "Users can follow others"
  on public.user_relationships for insert with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.user_relationships for delete using (auth.uid() = follower_id);

-- ── achievements ─────────────────────────────────────────────
create table public.achievements (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  badge_name text not null,
  badge_type text not null,
  earned_at  timestamptz not null default now()
);

alter table public.achievements enable row level security;

create policy "Achievements are viewable by everyone"
  on public.achievements for select using (true);

-- ── user_roles ───────────────────────────────────────────────
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  role       public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create policy "Roles are viewable by everyone"
  on public.user_roles for select using (true);

-- ── waitlist ─────────────────────────────────────────────────
create table public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

create policy "Anyone can join waitlist"
  on public.waitlist for insert with check (true);

create policy "Admins can view waitlist"
  on public.waitlist for select using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- ── has_role function ────────────────────────────────────────
create or replace function public.has_role(_role text, _user_id uuid default auth.uid())
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id
      and role = _role::public.app_role
  );
$$;
