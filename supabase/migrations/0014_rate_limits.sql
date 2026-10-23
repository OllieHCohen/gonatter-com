-- Fixed-window rate limiting for abuse-prone endpoints (signup, phone OTP,
-- login, password reset). Called only from the server with the service role.

create table rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

-- Deny-by-default: no policies, so only the service role can touch it.
alter table rate_limits enable row level security;

-- Atomically record one hit against `p_key` and report whether it is still
-- within `p_max` hits for the current `p_window_seconds` window.
create or replace function hit_rate_limit(p_key text, p_window_seconds integer, p_max integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  insert into rate_limits (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = rate_limits.count + 1
  returning count into v_count;

  -- Opportunistic cleanup so the table stays small.
  if random() < 0.01 then
    delete from rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_count <= p_max;
end;
$$;

revoke all on function hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function hit_rate_limit(text, integer, integer) to service_role;
