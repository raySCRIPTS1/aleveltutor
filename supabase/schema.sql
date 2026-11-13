create table public.tutor_settings (
  user_id uuid primary key references auth.users on delete cascade,
  personality text not null default 'warm and encouraging, but exacting',
  depth text not null default 'standard',        -- brief | standard | deep
  difficulty text not null default 'adaptive',   -- adaptive | easier | harder
  boards jsonb not null default '{"Mathematics":"Edexcel","Further Mathematics":"Edexcel","Physics":"AQA"}'
);
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null default 'New conversation',
  subject text not null, mode text not null default 'teaching',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null, bookmarked boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  subject text not null, topic text not null,
  correct boolean not null, understanding text not null check (understanding in ('concept','memorised','unclear')),
  note text, created_at timestamptz not null default now()
);
create table public.topic_mastery (
  user_id uuid not null references auth.users on delete cascade,
  subject text not null, topic text not null,
  score real not null default 0, attempts int not null default 0, correct int not null default 0,
  last_mistake text, updated_at timestamptz not null default now(),
  primary key (user_id, subject, topic)
);
alter table public.tutor_settings enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.attempts enable row level security;
alter table public.topic_mastery enable row level security;
create policy own_settings on public.tutor_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_convos on public.conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_msgs on public.messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_attempts on public.attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_mastery on public.topic_mastery for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
