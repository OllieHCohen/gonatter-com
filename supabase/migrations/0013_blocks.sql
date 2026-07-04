-- Personal block lists: either party can block the other, which stops ALL new
-- communication (messages + calls) in both directions until unblocked.

create table blocks (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table blocks enable row level security;

-- You manage (and see) only your own block list. Nobody can query who blocked
-- them — enforcement happens server-side and in policies below.
create policy blocks_select_own on blocks for select using (blocker_id = auth.uid());
create policy blocks_insert_own on blocks for insert with check (blocker_id = auth.uid());
create policy blocks_delete_own on blocks for delete using (blocker_id = auth.uid());

-- True when either side has blocked the other. SECURITY DEFINER so RLS
-- policies can consult the whole table without exposing rows to users.
create or replace function is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

-- Defence in depth: even direct API writes can't message or open conversations
-- across a block.
drop policy if exists msg_insert_party on messages;
create policy msg_insert_party on messages for insert
  with check (
    sender_id = auth.uid()
    and is_conversation_participant(conversation_id, auth.uid())
    and exists (
      select 1 from conversations c
      where c.id = conversation_id
        and not is_blocked_between(c.caller_id, c.listener_id)
    )
  );

drop policy if exists conv_insert_caller on conversations;
create policy conv_insert_caller on conversations for insert
  with check (caller_id = auth.uid() and not is_blocked_between(caller_id, listener_id));
