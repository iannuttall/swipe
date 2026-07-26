update suppressions
set domain = null, updated_at = now()
where email is not null
  and domain is not null;

alter table suppressions
  add constraint suppressions_email_domain_exclusive
  check (not (email is not null and domain is not null));
