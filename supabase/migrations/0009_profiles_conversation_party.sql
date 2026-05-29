-- A listener cannot otherwise read a caller's profile (callers are private by
-- default). Let either party in a shared conversation read the other's profile
-- row so messaging can show a name. No recursion: the conversations policies
-- don't reference profiles.
create policy profiles_select_conversation_party on profiles for select
  using (
    exists (
      select 1 from conversations c
      where (c.caller_id = auth.uid() and c.listener_id = profiles.id)
         or (c.listener_id = auth.uid() and c.caller_id = profiles.id)
    )
  );
