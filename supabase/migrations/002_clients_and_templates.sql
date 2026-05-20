-- ============================================================================
-- 002: マルチテナント化(顧問先・テンプレートの導入)
-- ----------------------------------------------------------------------------
-- 1 ユーザー(代行業者)が、複数の顧問先(クライアント企業)を抱え、
-- 各顧問先ごとに会社情報・署名・送信元・送信先・テンプレートを管理できるようにする。
-- ============================================================================

-- ---- clients(顧問先) ----------------------------------------------------
create table if not exists public.clients (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  name                text not null,                       -- 顧問先名(例: 株式会社サンプル軽貨物)
  service_description text default 'EC・ネット通販向けラストワンマイル配送',
  strengths           text,
  signature           text,                                -- 住所・電話を含む署名
  from_email          text,                                -- Resend で認証済みのアドレス
  daily_limit         integer not null default 10,
  send_time           text not null default '10:00',
  skip_weekends       boolean not null default true,
  active              boolean not null default true,       -- false にすると送信対象外
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists clients_user_id_idx on public.clients (user_id);

-- ---- email_templates(顧問先ごとのメール文面) -----------------------------
create table if not exists public.email_templates (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  name        text not null,                               -- テンプレ名(管理用、例: "A. 課題提示型")
  subject     text not null,                               -- {{会社名}} {{担当者名}} 等のプレースホルダ可
  body        text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists email_templates_client_id_idx on public.email_templates (client_id);
create index if not exists email_templates_client_active_idx on public.email_templates (client_id, active);

-- ---- contacts に client_id 列を追加 ---------------------------------------
alter table public.contacts add column if not exists client_id uuid references public.clients(id) on delete cascade;
create index if not exists contacts_client_id_idx on public.contacts (client_id);

-- 重複制約も client 単位に変更(同じ user の中でも client が違えば同じメアド可)
alter table public.contacts drop constraint if exists contacts_user_id_email_key;
alter table public.contacts add constraint contacts_client_id_email_key unique (client_id, email);

-- ---- user_settings: 現在選択中の顧問先を記録するだけに簡素化 --------------
alter table public.user_settings
  add column if not exists current_client_id uuid references public.clients(id) on delete set null;

-- updated_at トリガを clients / email_templates にも適用
drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

drop trigger if exists email_templates_set_updated_at on public.email_templates;
create trigger email_templates_set_updated_at before update on public.email_templates
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.clients          enable row level security;
alter table public.email_templates  enable row level security;

-- clients: 所有者のみ
drop policy if exists "clients: owner all" on public.clients;
create policy "clients: owner all" on public.clients for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- email_templates: 親 client のオーナーシップ経由
drop policy if exists "email_templates: owner all" on public.email_templates;
create policy "email_templates: owner all" on public.email_templates for all
  to authenticated
  using (exists (
    select 1 from public.clients c
    where c.id = email_templates.client_id and c.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.clients c
    where c.id = email_templates.client_id and c.user_id = auth.uid()
  ));

-- contacts の RLS は元のまま(user_id 所有者チェック)で OK
-- email_drafts は使わなくなるが互換のため残置
