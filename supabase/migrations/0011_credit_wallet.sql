-- Prepaid credit wallet for callers + realtime incoming-call notifications.

-- Balance lives on the caller profile; every movement is ledgered.
alter table caller_profiles add column credit_minor integer not null default 0;

create table credit_transactions (
  id                       uuid primary key default gen_random_uuid(),
  caller_id                uuid not null references profiles(id) on delete cascade,
  amount_minor             integer not null, -- positive = top-up, negative = call charge
  currency                 text not null default 'gbp',
  kind                     text not null check (kind in ('topup', 'call_charge', 'refund')),
  stripe_payment_intent_id text unique,      -- set for top-ups; unique = idempotent crediting
  call_session_id          uuid references call_sessions(id) on delete set null,
  created_at               timestamptz not null default now()
);

alter table credit_transactions enable row level security;

-- Callers may read their own ledger; all writes go through the service role.
create policy credit_transactions_select_own on credit_transactions
  for select using (auth.uid() = caller_id);
grant select on credit_transactions to authenticated;

-- Calls know how they were funded so settlement charges the right place.
alter table call_sessions add column funding text not null default 'card'
  check (funding in ('card', 'credit'));

-- Realtime on call_sessions so a listener's browser can pop an incoming-call
-- banner the moment a caller starts a call.
alter table call_sessions replica identity full;
alter publication supabase_realtime add table call_sessions;
