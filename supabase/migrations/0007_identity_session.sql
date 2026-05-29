-- Track the Stripe Identity verification session so we can reconcile on return.
alter table listener_profiles
  add column if not exists stripe_identity_session_id text;
