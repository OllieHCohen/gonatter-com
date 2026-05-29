-- Column-level privileges: RLS gates WHICH rows; these gate WHICH columns a
-- normal (authenticated) user may write. Verification, identity, payouts,
-- ratings and call-count are server-authoritative (service_role only).
-- service_role keeps full privileges (Supabase default grants + BYPASSRLS).

-- profiles: users edit only their display name, country, languages.
-- phone / phone_verified / role / status are set server-side only.
revoke update on profiles from authenticated;
grant update (display_name, country, languages) on profiles to authenticated;

-- listener_profiles: users edit their public-facing profile + availability + rate.
-- id_verified, charges_enabled, stripe_*, calls_count, rating_* are server-only.
revoke update on listener_profiles from authenticated;
grant update (
  bio, gender, dob, photo_url,
  per_minute_rate_minor, rate_currency,
  available, available_updated_at
) on listener_profiles to authenticated;

-- caller_profiles: users edit their optional fields + interests + reminder flag.
-- stripe_customer_id is server-only.
revoke update on caller_profiles from authenticated;
grant update (gender, dob, interests, seen_platonic_reminder)
  on caller_profiles to authenticated;
