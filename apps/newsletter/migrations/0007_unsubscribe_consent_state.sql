update suppressions
set active = false,
    updated_at = now()
where reason = 'unsubscribe'
  and active = true;
