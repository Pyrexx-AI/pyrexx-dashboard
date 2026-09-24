-- ═══════════════════════════════════════════════════════════════
-- Pyrexx Dashboard — Initial Schema
-- ═══════════════════════════════════════════════════════════════
-- WHY THIS FILE EXISTS: this schema — every table, enum, RLS
-- policy, and the handle_new_user() trigger — previously existed
-- ONLY as prose comments scattered across the codebase (e.g.
-- "see 0001_init_schema.sql" in lib/supabase/server.ts and
-- api/onboarding/route.ts) and as an emergency SQL snippet baked
-- into AccountStep.tsx's error-recovery UI. There was no checked-in
-- migration anywhere — meaning the actual security model (RLS
-- policies) could not be reviewed, versioned, or reliably
-- reproduced for a new environment. This file is that missing
-- source of truth, reconstructed to match exactly what
-- src/types/database.ts and every route handler in this codebase
-- already assume exists.
--
-- Run this against a fresh Supabase project's SQL Editor, or via
-- `supabase db push` / `supabase migration up` with the Supabase
-- CLI. It has been syntax- and logic-validated against a local
-- Postgres 16 instance with a stubbed `auth` schema (this repo
-- doesn't ship a Supabase project to test against directly).
-- ═══════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─── Enums ────────────────────────────────────────────────────
create type public.clinic_status as enum ('onboarding', 'pending_setup', 'active', 'suspended');
create type public.crm_provider as enum ('jane', 'cliniko', 'mindbody', 'vagaro', 'acuity', 'square_appointments', 'hubspot', 'other', 'none');
create type public.plan_tier as enum ('overflow', 'full_time', 'usage_based');
create type public.provisioning_status as enum ('pending', 'provisioning', 'provisioned', 'failed');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete');
create type public.user_role as enum ('admin', 'owner', 'staff');

-- ─── clinics ──────────────────────────────────────────────────
create table public.clinics (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null,
  website                     text,
  phone_number                text not null,
  contact_email               text not null unique,
  crm_provider                public.crm_provider not null default 'none',
  crm_other_name              text,
  receptionist_name           text not null,
  plan_tier                   public.plan_tier not null default 'overflow',
  plan_price_cents            integer not null default 100000,
  status                      public.clinic_status not null default 'onboarding',
  subscription_status         public.subscription_status,
  dodo_customer_id            text,
  dodo_subscription_id        text,
  dodo_product_id             text,
  agent_id                    text,
  agent_phone_number          text,
  agent_provisioning_status   public.provisioning_status not null default 'pending',
  agent_provisioning_error    text,
  escalation_phone_number     text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- ─── profiles ─────────────────────────────────────────────────
-- One row per auth.users row, created automatically by
-- handle_new_user() below. clinic_id is nullable — an
-- authenticated user with no clinic_id is the "orphaned account"
-- state ProfilePanel.tsx explicitly handles.
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  clinic_id   uuid references public.clinics(id) on delete set null,
  role        public.user_role not null default 'owner',
  full_name   text,
  created_at  timestamptz not null default now()
);

-- ─── call_records ─────────────────────────────────────────────
-- id = Retell's call_id (text, not generated) — see
-- lib/retell/store.ts's upsert(..., { onConflict: "id" }).
create table public.call_records (
  id                    text primary key,
  clinic_id             uuid not null references public.clinics(id) on delete cascade,
  patient_name          text not null default 'Unknown Caller',
  service_type          text not null default 'General Inquiry',
  status                text not null,
  outcome               text,
  started_at            timestamptz not null,
  duration_ms           integer,
  transcript            text,
  transcript_preview    text,
  booking_time          timestamptz,
  recording_url         text,
  raw_payload           jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Backs lib/retell/store.ts's getRecent/getByStatus (dashboard lists)
create index call_records_clinic_started_idx on public.call_records (clinic_id, started_at desc);
-- Backs getUpcomingBookings — partial index since most rows have no booking_time
create index call_records_clinic_booking_idx on public.call_records (clinic_id, booking_time) where booking_time is not null;

-- ─── integration_credentials ───────────────────────────────────
-- `credentials` stores an ENCRYPTED blob as of the app-layer fix in
-- lib/crypto/credentials.ts — this column itself has no special
-- Postgres-level encryption; see that module's doc comment for why
-- application-level AES-256-GCM was chosen over pgsodium/pgcrypto
-- column encryption.
create table public.integration_credentials (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics(id) on delete cascade,
  provider    text not null,
  credentials jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (clinic_id, provider)
);

-- ─── legal_documents ────────────────────────────────────────────
create table public.legal_documents (
  id                uuid primary key default gen_random_uuid(),
  type              text not null unique,
  title             text not null,
  version           text not null default 'v1.0.0',
  content_markdown  text not null,
  file_url          text,
  file_type         text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─── signed_agreements ──────────────────────────────────────────
create table public.signed_agreements (
  id                  uuid primary key default gen_random_uuid(),
  clinic_id           uuid not null references public.clinics(id) on delete cascade,
  document_type       text not null,
  document_version    text not null,
  signer_name         text not null,
  signer_title        text,
  ip_address          text,
  signed_at           timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════
-- Helper functions (referenced throughout RLS policies below, and
-- in src/types/database.ts's Functions type)
-- ═══════════════════════════════════════════════════════════════

create or replace function public.current_clinic_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select clinic_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ═══════════════════════════════════════════════════════════════
-- handle_new_user() trigger
-- ═══════════════════════════════════════════════════════════════
-- Reads clinic_id/role/full_name out of auth.users.raw_user_meta_data
-- so both flows work without any extra code:
--   • /api/onboarding/finish (AccountStep.tsx) sets role via
--     supabase.auth.admin.createUser({ user_metadata: { clinic_id, role: 'owner', full_name } })
--   • The team-invite flow (ProfilePanel.tsx "Invite") sets
--     supabase.auth.admin.inviteUserByEmail(email, { data: { clinic_id, role: 'staff' } })
--
-- This is intentionally kept as a "never block auth.users insert"
-- trigger (errors are caught and logged, not raised) — matching the
-- exact defensive pattern already documented as an emergency fix in
-- AccountStep.tsx's error-recovery UI, since a failure here must
-- never prevent someone from being able to sign up at all.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.profiles (id, clinic_id, role, full_name)
    values (
      new.id,
      nullif(new.raw_user_meta_data->>'clinic_id', '')::uuid,
      coalesce(new.raw_user_meta_data->>'role', 'owner')::public.user_role,
      new.raw_user_meta_data->>'full_name'
    );
  exception when others then
    raise log 'Profile creation failed for user %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════
-- Every route in this codebase that reads/writes as an
-- authenticated user (not the service-role admin client) relies on
-- these policies. Server routes that use createAdminClient()
-- (webhooks, admin/actions.ts, dashboard/summary, dashboard/metrics)
-- bypass RLS entirely by design — those routes each carry their own
-- explicit ownership/admin check in application code, documented in
-- their own file comments.

alter table public.clinics                 enable row level security;
alter table public.profiles                enable row level security;
alter table public.call_records            enable row level security;
alter table public.integration_credentials enable row level security;
alter table public.legal_documents         enable row level security;
alter table public.signed_agreements       enable row level security;

-- GRANTs are separate from RLS in Postgres: RLS restricts which
-- ROWS a role can see, but the role still needs a base GRANT to
-- touch the table at all. A Supabase project's dashboard sets these
-- up automatically the moment a table is created there — but since
-- this migration is meant to be run standalone (SQL Editor or CLI)
-- and self-contained, those grants are made explicit here rather
-- than assumed.
grant usage on schema public to anon, authenticated;

grant select, update on public.clinics to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.call_records to authenticated;
grant select on public.integration_credentials to authenticated; -- RLS policy still restricts this to admins only
grant select on public.legal_documents to anon, authenticated;
grant select on public.signed_agreements to authenticated;

-- clinics: members of the clinic (via profiles.clinic_id) or an
-- admin can read it. Direct client-side reads happen in
-- ProfilePanel.tsx via lib/supabase/client.ts's anon-key client.
create policy "clinics_select_own_or_admin" on public.clinics
  for select using (id = public.current_clinic_id() or public.is_admin());

-- Allows an owner/staff member to update their own clinic's basic
-- profile fields (name/phone/website) directly if a future feature
-- calls Supabase from the client rather than a server route. The
-- "Edit Clinic Profile" feature added in this phase goes through
-- api/clinic/update-profile/route.ts using the service-role client
-- with its own explicit checks instead of relying on this policy
-- alone — this is a defensive backstop, not the only gate.
create policy "clinics_update_own_or_admin" on public.clinics
  for update using (id = public.current_clinic_id() or public.is_admin())
  with check (id = public.current_clinic_id() or public.is_admin());

-- profiles: a user can always see their own row; clinic teammates
-- can see each other (ProfilePanel.tsx's Team Members list depends
-- on this); admins see everyone.
create policy "profiles_select_self_team_or_admin" on public.profiles
  for select using (
    id = auth.uid()
    or clinic_id = public.current_clinic_id()
    or public.is_admin()
  );

create policy "profiles_update_self_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- call_records: read-only for clinic members/admins. There is
-- intentionally NO insert/update/delete policy for the
-- `authenticated` role — every write comes from
-- lib/retell/store.ts via the service-role client (webhooks), which
-- bypasses RLS entirely.
create policy "call_records_select_own_or_admin" on public.call_records
  for select using (clinic_id = public.current_clinic_id() or public.is_admin());

-- integration_credentials: admin-only, by design — clinic dashboards
-- never display raw CRM/API credentials (see ClientSetupForm.tsx,
-- an /admin-only component). No policy at all for regular clinic
-- members means they get zero rows, not an error.
create policy "integration_credentials_admin_only" on public.integration_credentials
  for all using (public.is_admin()) with check (public.is_admin());

-- legal_documents: readable by anyone, including a not-yet-authenticated
-- visitor — lib/legal-docs/index.ts's getLegalDocuments() calls this
-- from the onboarding wizard BEFORE any account/session exists, using
-- the anon-key browser client (src/lib/supabase/client.ts).
create policy "legal_documents_public_read_active" on public.legal_documents
  for select to anon, authenticated
  using (is_active = true);

-- Writing legal documents is admin-only (api/admin/legal/upload/route.ts
-- uses the service-role client anyway, so this is a defensive backstop).
create policy "legal_documents_admin_write" on public.legal_documents
  for all using (public.is_admin()) with check (public.is_admin());

-- signed_agreements: a clinic can see its own signed agreements;
-- admins can see all. Inserts happen via api/onboarding/start's
-- service-role client (before any user session exists), so no
-- authenticated-role insert policy is needed.
create policy "signed_agreements_select_own_or_admin" on public.signed_agreements
  for select using (clinic_id = public.current_clinic_id() or public.is_admin());