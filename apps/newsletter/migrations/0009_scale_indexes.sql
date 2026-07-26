create index suppressions_active_email_idx
  on suppressions (email)
  where active = true and email is not null;

create index suppressions_active_domain_idx
  on suppressions (domain)
  where active = true and domain is not null;

create index contact_tags_tag_contact_idx
  on contact_tags (tag_id, contact_id);

create index purchases_product_contact_idx
  on purchases (product_key, contact_id);

create index messages_planned_schedule_rank_idx
  on messages (scheduled_at, send_rank)
  where status = 'planned';

create index link_rollups_tags_gin_idx
  on link_rollups using gin (tags);

create index link_rollups_topics_gin_idx
  on link_rollups using gin (topics);

create index contact_link_rollups_tags_gin_idx
  on contact_link_rollups using gin (tags);

create index contact_link_rollups_topics_gin_idx
  on contact_link_rollups using gin (topics);

create index events_contact_type_occurred_idx
  on events (contact_id, type, occurred_at);

create index events_broadcast_type_idx
  on events (broadcast_id, type);

create index events_link_type_idx
  on events (link_id, type);
