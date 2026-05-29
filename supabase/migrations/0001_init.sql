-- gonatter — initial schema (spec §6).
-- Money stored in MINOR UNITS (integer) + lowercase ISO-4217 currency code.
-- RLS is added in 0002_rls.sql; money/settlement tables are written only by
-- Edge Functions / server routes using the service role.

create extension if not exists "pgcrypto";

-- ── Enums ─────────────────────────────────────────────────────────────────
create type user_role        as enum ('caller', 'listener', 'admin');
create type profile_status   as enum ('active', 'suspended', 'banned');
create type conversation_state as enum ('open', 'accepted', 'declined', 'closed');
create type call_state       as enum ('authorising', 'active', 'completed', 'cancelled', 'failed');
create type call_end_reason  as enum ('caller_left', 'listener_left', 'block_reached', 'no_show', 'error');
create type review_direction as enum ('caller_to_listener', 'listener_to_caller');
create type report_category  as enum ('distress_self_harm', 'sexual_adult', 'abuse_harassment', 'scam_fraud', 'csam', 'other');
create type report_state     as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type payment_status   as enum ('requires_capture', 'captured', 'canceled', 'refunded', 'failed');
create type payout_status    as enum ('pending', 'paid', 'failed', 'reversed');

-- ── updated_at helper ─────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── profiles (1:1 with auth.users) ────────────────────────────────────────
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          user_role not null default 'caller',
  display_name  text not null,
  country       text,                         -- ISO 3166-1 alpha-2, lowercase
  languages     text[] not null default '{}', -- stored, not an MVP filter
  phone_verified boolean not null default false,
  status        profile_status not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- ── listener_profiles ─────────────────────────────────────────────────────
create table listener_profiles (
  profile_id           uuid primary key references profiles(id) on delete cascade,
  bio                  text,
  gender               text,
  dob                  date,
  photo_url            text,
  per_minute_rate_minor integer not null default 0,  -- in rate_currency minor units
  rate_currency        text not null default 'gbp',
  id_verified          boolean not null default false,
  stripe_account_id    text,                          -- Connect Express acct
  stripe_identity_status text not null default 'unstarted', -- unstarted|pending|verified|failed
  charges_enabled      boolean not null default false, -- Connect payouts ready
  available            boolean not null default false,
  available_updated_at timestamptz,                   -- heartbeat for idle auto-off
  calls_count          integer not null default 0,
  rating_avg           numeric(3,2) not null default 0,
  rating_count         integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create trigger trg_listener_updated before update on listener_profiles
  for each row execute function set_updated_at();
create index listener_discovery_idx on listener_profiles (available, id_verified);

-- A listener is discoverable only when verified, connected and toggled on.
create or replace function listener_is_live(lp listener_profiles)
returns boolean language sql immutable as $$
  select lp.id_verified and lp.charges_enabled and lp.available;
$$;

-- ── caller_profiles ───────────────────────────────────────────────────────
create table caller_profiles (
  profile_id          uuid primary key references profiles(id) on delete cascade,
  gender              text,
  dob                 date,
  stripe_customer_id  text,
  interests           text[] not null default '{}',
  seen_platonic_reminder boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger trg_caller_updated before update on caller_profiles
  for each row execute function set_updated_at();

-- ── interests taxonomy ────────────────────────────────────────────────────
create table interests (
  id         text primary key,   -- stable slug
  label      text not null,
  sort_order integer not null default 0
);

create table listener_interests (
  listener_id uuid not null references profiles(id) on delete cascade,
  interest_id text not null references interests(id) on delete cascade,
  primary key (listener_id, interest_id)
);

-- ── conversations + messages (pre-chat) ───────────────────────────────────
create table conversations (
  id          uuid primary key default gen_random_uuid(),
  caller_id   uuid not null references profiles(id) on delete cascade,
  listener_id uuid not null references profiles(id) on delete cascade,
  state       conversation_state not null default 'open',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (caller_id, listener_id)
);
create trigger trg_conversations_updated before update on conversations
  for each row execute function set_updated_at();

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references profiles(id) on delete cascade,
  body            text not null,
  created_at      timestamptz not null default now()
);
create index messages_conversation_idx on messages (conversation_id, created_at);

-- ── call_sessions (server-authoritative) ──────────────────────────────────
create table call_sessions (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references conversations(id) on delete cascade,
  caller_id         uuid not null references profiles(id) on delete cascade,
  listener_id       uuid not null references profiles(id) on delete cascade,
  livekit_room      text not null unique,
  rate_minor        integer not null,
  rate_currency     text not null,
  block_minutes     integer not null check (block_minutes in (30, 60)),
  authorised_amount_minor integer not null,
  started_at        timestamptz,
  both_connected_at timestamptz,
  ended_at          timestamptz,
  billable_seconds  integer,
  final_amount_minor integer,
  state             call_state not null default 'authorising',
  end_reason        call_end_reason,
  caller_connected  boolean not null default false,
  listener_connected boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger trg_call_sessions_updated before update on call_sessions
  for each row execute function set_updated_at();
create index call_sessions_caller_idx on call_sessions (caller_id, created_at desc);
create index call_sessions_listener_idx on call_sessions (listener_id, created_at desc);

-- ── payments ──────────────────────────────────────────────────────────────
create table payments (
  id                      uuid primary key default gen_random_uuid(),
  call_session_id         uuid not null references call_sessions(id) on delete cascade,
  stripe_payment_intent_id text not null unique,
  authorised_amount_minor integer not null,
  captured_amount_minor   integer,
  currency                text not null,
  status                  payment_status not null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create trigger trg_payments_updated before update on payments
  for each row execute function set_updated_at();

-- ── payouts ───────────────────────────────────────────────────────────────
create table payouts (
  id                 uuid primary key default gen_random_uuid(),
  call_session_id    uuid not null references call_sessions(id) on delete cascade,
  listener_id        uuid not null references profiles(id) on delete cascade,
  stripe_transfer_id text unique,
  amount_minor       integer not null,
  currency           text not null,
  platform_fee_minor integer not null,
  status             payout_status not null default 'pending',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger trg_payouts_updated before update on payouts
  for each row execute function set_updated_at();

-- ── reviews ───────────────────────────────────────────────────────────────
create table reviews (
  id              uuid primary key default gen_random_uuid(),
  call_session_id uuid not null references call_sessions(id) on delete cascade,
  reviewer_id     uuid not null references profiles(id) on delete cascade,
  subject_id      uuid not null references profiles(id) on delete cascade,
  direction       review_direction not null,
  rating          integer not null check (rating between 1 and 5),
  body            text,
  is_public       boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (call_session_id, reviewer_id)
);
create index reviews_subject_idx on reviews (subject_id) where is_public;

-- ── reports ───────────────────────────────────────────────────────────────
create table reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid not null references profiles(id) on delete cascade,
  subject_id      uuid references profiles(id) on delete set null,
  call_session_id uuid references call_sessions(id) on delete set null,
  category        report_category not null,
  body            text,
  state           report_state not null default 'open',
  handled_by      uuid references profiles(id) on delete set null,
  resolution      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_reports_updated before update on reports
  for each row execute function set_updated_at();
create index reports_state_idx on reports (state, created_at desc);

-- ── crisis_resources (seed data; §8.4) ────────────────────────────────────
create table crisis_resources (
  id           uuid primary key default gen_random_uuid(),
  country_code text,            -- ISO alpha-2 lowercase; null = international
  name         text not null,
  phone        text,
  url          text,
  notes        text,
  sort_order   integer not null default 0
);
create index crisis_resources_country_idx on crisis_resources (country_code);

-- ── audit_log (admin / safety actions) ────────────────────────────────────
create table audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references profiles(id) on delete set null,
  action     text not null,
  target     text,
  detail     jsonb,
  created_at timestamptz not null default now()
);

-- ── rating aggregate maintenance ──────────────────────────────────────────
create or replace function recompute_listener_rating(p_listener uuid)
returns void language sql as $$
  update listener_profiles lp set
    rating_avg = coalesce((
      select round(avg(rating)::numeric, 2) from reviews r
      where r.subject_id = p_listener and r.direction = 'caller_to_listener' and r.is_public), 0),
    rating_count = (
      select count(*) from reviews r
      where r.subject_id = p_listener and r.direction = 'caller_to_listener' and r.is_public)
  where lp.profile_id = p_listener;
$$;

create or replace function trg_review_recompute()
returns trigger language plpgsql as $$
begin
  if (new.direction = 'caller_to_listener') then
    perform recompute_listener_rating(new.subject_id);
  end if;
  return new;
end;
$$;
create trigger trg_reviews_recompute after insert or update on reviews
  for each row execute function trg_review_recompute();
