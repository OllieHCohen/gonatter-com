-- Admin access becomes a grantable flag on any account (the legacy 'admin'
-- role keeps working). Granted/revoked from the admin area.
alter table profiles add column is_admin boolean not null default false;

-- Bug reports from the floating "report a bug" widget. Rows are inserted via
-- the service role from a server action (so anonymous visitors can report
-- too) and read/updated by admins only — hence RLS on with no policies.
create table bug_reports (
  id             uuid primary key default gen_random_uuid(),
  reporter_id    uuid references profiles(id) on delete set null,
  reporter_email text,
  description    text not null,
  page_url       text not null,
  context        jsonb not null default '{}'::jsonb,
  status         text not null default 'new'
                   check (status in ('new', 'in_progress', 'resolved', 'dismissed')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table bug_reports enable row level security;

create trigger trg_bug_reports_updated before update on bug_reports
  for each row execute function set_updated_at();
