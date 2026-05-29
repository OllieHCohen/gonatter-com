-- Store the verified phone (E.164) for OTP + optional SMS notifications.
alter table profiles add column if not exists phone text;
