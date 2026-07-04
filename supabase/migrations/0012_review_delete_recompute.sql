-- Rating aggregates must survive review deletion (e.g. an admin removing an
-- abusive review). The original trigger only fired on insert/update.
create or replace function trg_review_recompute()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'DELETE') then
    if (old.direction = 'caller_to_listener') then
      perform recompute_listener_rating(old.subject_id);
    end if;
    return old;
  end if;
  if (new.direction = 'caller_to_listener') then
    perform recompute_listener_rating(new.subject_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reviews_recompute on reviews;
create trigger trg_reviews_recompute after insert or update or delete on reviews
  for each row execute function trg_review_recompute();
