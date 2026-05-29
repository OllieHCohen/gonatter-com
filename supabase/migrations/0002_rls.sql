-- gonatter — Row-Level Security (spec §6 note: RLS on all user tables;
-- money/settlement tables written only by service role).
-- service_role has BYPASSRLS, so server routes can do trusted writes.

-- ── helpers (SECURITY DEFINER → run as owner, bypass RLS, no recursion) ────
create or replace function is_admin(uid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (select 1 from profiles p where p.id = uid and p.role = 'admin');
$$;

create or replace function is_conversation_participant(conv uuid, uid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from conversations c
    where c.id = conv and (c.caller_id = uid or c.listener_id = uid)
  );
$$;

-- ── enable RLS everywhere ──────────────────────────────────────────────────
alter table profiles            enable row level security;
alter table listener_profiles   enable row level security;
alter table caller_profiles     enable row level security;
alter table interests           enable row level security;
alter table listener_interests  enable row level security;
alter table conversations       enable row level security;
alter table messages            enable row level security;
alter table call_sessions       enable row level security;
alter table payments            enable row level security;
alter table payouts             enable row level security;
alter table reviews             enable row level security;
alter table reports             enable row level security;
alter table crisis_resources    enable row level security;
alter table audit_log           enable row level security;

-- ── profiles ───────────────────────────────────────────────────────────────
create policy profiles_select_own on profiles for select
  using (id = auth.uid());
-- Listener identity is public (needed for discovery + reviews display).
create policy profiles_select_listeners on profiles for select
  using (role = 'listener');
create policy profiles_insert_own on profiles for insert
  with check (id = auth.uid());
create policy profiles_update_own on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- ── listener_profiles ──────────────────────────────────────────────────────
create policy lp_select_public on listener_profiles for select
  using (id_verified = true);
create policy lp_select_own on listener_profiles for select
  using (profile_id = auth.uid());
create policy lp_insert_own on listener_profiles for insert
  with check (profile_id = auth.uid());
create policy lp_update_own on listener_profiles for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ── caller_profiles (strictly private) ─────────────────────────────────────
create policy cp_select_own on caller_profiles for select
  using (profile_id = auth.uid());
create policy cp_insert_own on caller_profiles for insert
  with check (profile_id = auth.uid());
create policy cp_update_own on caller_profiles for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ── interests / listener_interests (public read; writes = service role) ────
create policy interests_select_all on interests for select using (true);
create policy li_select_all on listener_interests for select using (true);
create policy li_write_own on listener_interests for all
  using (listener_id = auth.uid()) with check (listener_id = auth.uid());

-- ── conversations ──────────────────────────────────────────────────────────
create policy conv_select_party on conversations for select
  using (caller_id = auth.uid() or listener_id = auth.uid());
create policy conv_insert_caller on conversations for insert
  with check (caller_id = auth.uid());
create policy conv_update_party on conversations for update
  using (caller_id = auth.uid() or listener_id = auth.uid())
  with check (caller_id = auth.uid() or listener_id = auth.uid());

-- ── messages ───────────────────────────────────────────────────────────────
create policy msg_select_party on messages for select
  using (is_conversation_participant(conversation_id, auth.uid()));
create policy msg_insert_party on messages for insert
  with check (sender_id = auth.uid() and is_conversation_participant(conversation_id, auth.uid()));

-- ── call_sessions (read own; writes = service role only) ────────────────────
create policy cs_select_party on call_sessions for select
  using (caller_id = auth.uid() or listener_id = auth.uid());

-- ── payments (caller reads own; writes = service role only) ────────────────
create policy pay_select_caller on payments for select
  using (exists (
    select 1 from call_sessions cs
    where cs.id = payments.call_session_id and cs.caller_id = auth.uid()));

-- ── payouts (listener reads own; writes = service role only) ────────────────
create policy payout_select_listener on payouts for select
  using (listener_id = auth.uid());

-- ── reviews (public reads + own; writes = service role via API) ────────────
create policy reviews_select_public on reviews for select
  using (is_public = true);
create policy reviews_select_own on reviews for select
  using (reviewer_id = auth.uid() or subject_id = auth.uid());

-- ── reports (file own + read own; moderation = service role/admin) ─────────
create policy reports_insert_own on reports for insert
  with check (reporter_id = auth.uid());
create policy reports_select_own on reports for select
  using (reporter_id = auth.uid());

-- ── crisis_resources (public read; writes = service role) ──────────────────
create policy crisis_select_all on crisis_resources for select using (true);

-- audit_log: no policies → only service role can touch it.
