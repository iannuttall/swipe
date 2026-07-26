create table if not exists canary_campaigns (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references drafts(id) on delete cascade,
  name text,
  status text not null default 'active',
  audience jsonb not null default '{}'::jsonb,
  delivery_policy jsonb not null default '{}'::jsonb,
  steps jsonb not null,
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists canary_campaigns_status_idx
  on canary_campaigns(status);

create index if not exists canary_campaigns_draft_idx
  on canary_campaigns(draft_id);

create table if not exists canary_cohorts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references canary_campaigns(id) on delete cascade,
  step_index integer not null,
  target jsonb not null,
  target_total integer not null,
  added_count integer not null,
  broadcast_id uuid not null references broadcasts(id) on delete cascade,
  contact_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canary_cohorts_campaign_step_unique unique (campaign_id, step_index)
);

create index if not exists canary_cohorts_broadcast_idx
  on canary_cohorts(broadcast_id);
