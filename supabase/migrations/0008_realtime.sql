-- Enable Postgres logical replication for pre-chat messaging. Realtime still
-- enforces RLS on the client subscription, so participants only receive rows
-- in conversations they belong to.
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;

alter table messages replica identity full;
alter table conversations replica identity full;
