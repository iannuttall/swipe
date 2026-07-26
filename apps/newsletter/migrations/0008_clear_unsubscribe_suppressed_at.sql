update contacts
set suppressed_at = null,
    updated_at = now()
where status = 'unsubscribed'
  and suppressed_at is not null;
