-- Public bucket for Listener profile photos. Listeners upload to a folder
-- named by their own user id; anyone can read (photos appear in discovery).
insert into storage.buckets (id, name, public)
values ('listener-photos', 'listener-photos', true)
on conflict (id) do nothing;

-- Public read of photos.
create policy "listener photos public read"
  on storage.objects for select
  using (bucket_id = 'listener-photos');

-- A listener may write/replace/delete only files under their own uid prefix.
create policy "listener photos insert own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listener-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "listener photos update own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'listener-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "listener photos delete own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'listener-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
