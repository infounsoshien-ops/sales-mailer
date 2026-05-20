-- ============================================================================
-- keikamotsu-sales-mailer  initial schema
-- Supabase SQL Editor で実行してください
-- ============================================================================

-- ---- contacts (送信先リスト) ----------------------------------------------
create table if not exists public.contacts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  company_name  text not null,
  industry      text,
  person_name   text,
  email         text not null,
  note          text,
  -- pending / sent / replied / unsubscribed / failed
  status        text not null default 'pending'
                  check (status in ('pending', 'sent', 'replied', 'unsubscribed', 'failed')),
  replied       boolean not null default false,
  replied_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, email)
);

create index if not exists contacts_user_id_status_idx on public.contacts (user_id, status);
create index if not exists contacts_user_id_created_at_idx on public.contacts (user_id, created_at desc);

-- ---- email_drafts (Claude API で生成済みのメール本文) ---------------------
create table if not exists public.email_drafts (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null references public.contacts(id) on delete cascade,
  subject     text not null,
  body        text not null,
  created_at  timestamptz not null default now(),
  unique (contact_id)  -- 1 contact につき 1 draft
);

-- ---- email_logs (送信履歴) -------------------------------------------------
create table if not exists public.email_logs (
  id             uuid primary key default gen_random_uuid(),
  contact_id     uuid not null references public.contacts(id) on delete cascade,
  resend_id      text,
  subject        text,
  body           text,
  sent_at        timestamptz not null default now(),
  opened_at      timestamptz,
  bounced        boolean not null default false,
  error_message  text,
  retry_count    integer not null default 0
);

create index if not exists email_logs_contact_id_idx on public.email_logs (contact_id);
create index if not exists email_logs_resend_id_idx on public.email_logs (resend_id);
create index if not exists email_logs_sent_at_idx on public.email_logs (sent_at desc);

-- ---- user_settings ---------------------------------------------------------
create table if not exists public.user_settings (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  company_name         text,
  service_description  text default 'EC・ネット通販向けラストワンマイル配送',
  strengths            text,
  signature            text,
  from_email           text,
  daily_limit          integer not null default 10,
  send_time            text not null default '10:00',
  skip_weekends        boolean not null default true,
  email_tone           text not null default '丁寧で簡潔',
  updated_at           timestamptz not null default now()
);

-- ---- updated_at 自動更新トリガ --------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contacts_set_updated_at on public.contacts;
create trigger contacts_set_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();

-- ---- 新規ユーザー作成時に user_settings 行を自動生成 ----------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.contacts        enable row level security;
alter table public.email_drafts    enable row level security;
alter table public.email_logs      enable row level security;
alter table public.user_settings   enable row level security;

-- ---- contacts ポリシー ----------------------------------------------------
drop policy if exists "contacts: owner read"   on public.contacts;
drop policy if exists "contacts: owner write"  on public.contacts;
drop policy if exists "contacts: owner update" on public.contacts;
drop policy if exists "contacts: owner delete" on public.contacts;

create policy "contacts: owner read"
  on public.contacts for select
  to authenticated
  using (auth.uid() = user_id);

create policy "contacts: owner write"
  on public.contacts for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "contacts: owner update"
  on public.contacts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "contacts: owner delete"
  on public.contacts for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---- email_drafts ポリシー(contacts オーナーシップ経由)-------------------
drop policy if exists "email_drafts: owner read"   on public.email_drafts;
drop policy if exists "email_drafts: owner write"  on public.email_drafts;
drop policy if exists "email_drafts: owner update" on public.email_drafts;
drop policy if exists "email_drafts: owner delete" on public.email_drafts;

create policy "email_drafts: owner read"
  on public.email_drafts for select
  to authenticated
  using (exists (
    select 1 from public.contacts c
    where c.id = email_drafts.contact_id and c.user_id = auth.uid()
  ));

create policy "email_drafts: owner write"
  on public.email_drafts for insert
  to authenticated
  with check (exists (
    select 1 from public.contacts c
    where c.id = email_drafts.contact_id and c.user_id = auth.uid()
  ));

create policy "email_drafts: owner update"
  on public.email_drafts for update
  to authenticated
  using (exists (
    select 1 from public.contacts c
    where c.id = email_drafts.contact_id and c.user_id = auth.uid()
  ));

create policy "email_drafts: owner delete"
  on public.email_drafts for delete
  to authenticated
  using (exists (
    select 1 from public.contacts c
    where c.id = email_drafts.contact_id and c.user_id = auth.uid()
  ));

-- ---- email_logs ポリシー --------------------------------------------------
drop policy if exists "email_logs: owner read"   on public.email_logs;
drop policy if exists "email_logs: owner write"  on public.email_logs;
drop policy if exists "email_logs: owner update" on public.email_logs;

create policy "email_logs: owner read"
  on public.email_logs for select
  to authenticated
  using (exists (
    select 1 from public.contacts c
    where c.id = email_logs.contact_id and c.user_id = auth.uid()
  ));

create policy "email_logs: owner write"
  on public.email_logs for insert
  to authenticated
  with check (exists (
    select 1 from public.contacts c
    where c.id = email_logs.contact_id and c.user_id = auth.uid()
  ));

create policy "email_logs: owner update"
  on public.email_logs for update
  to authenticated
  using (exists (
    select 1 from public.contacts c
    where c.id = email_logs.contact_id and c.user_id = auth.uid()
  ));

-- ---- user_settings ポリシー -----------------------------------------------
drop policy if exists "user_settings: owner read"   on public.user_settings;
drop policy if exists "user_settings: owner write"  on public.user_settings;
drop policy if exists "user_settings: owner update" on public.user_settings;

create policy "user_settings: owner read"
  on public.user_settings for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_settings: owner write"
  on public.user_settings for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_settings: owner update"
  on public.user_settings for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
