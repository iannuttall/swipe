CREATE TYPE contact_status AS ENUM ('active', 'unsubscribed', 'suppressed');
CREATE TYPE subscription_status AS ENUM ('subscribed', 'unsubscribed');
CREATE TYPE suppression_reason AS ENUM (
  'unsubscribe',
  'hard_bounce',
  'complaint',
  'manual',
  'invalid_email',
  'domain_block'
);
CREATE TYPE draft_status AS ENUM ('draft', 'ready', 'archived');
CREATE TYPE broadcast_status AS ENUM (
  'draft',
  'scheduled',
  'sending',
  'paused',
  'completed',
  'cancelled',
  'failed'
);
CREATE TYPE message_status AS ENUM (
  'planned',
  'queued',
  'sending',
  'sent',
  'failed',
  'bounced',
  'complained',
  'skipped'
);
CREATE TYPE event_type AS ENUM (
  'contact.subscribed',
  'contact.unsubscribed',
  'contact.suppressed',
  'contact.tagged',
  'contact.purchase_recorded',
  'message.planned',
  'message.queued',
  'message.sent',
  'message.failed',
  'message.bounced',
  'message.complained',
  'engagement.opened',
  'engagement.clicked'
);

CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  email_domain text NOT NULL,
  name text,
  status contact_status NOT NULL DEFAULT 'active',
  attributes jsonb NOT NULL DEFAULT '{}',
  source text,
  hard_bounce_count integer NOT NULL DEFAULT 0,
  soft_bounce_count integer NOT NULL DEFAULT 0,
  complaint_count integer NOT NULL DEFAULT 0,
  subscribed_at timestamptz,
  unsubscribed_at timestamptz,
  suppressed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX contacts_email_unique ON contacts (email);
CREATE INDEX contacts_status_idx ON contacts (status);
CREATE INDEX contacts_domain_idx ON contacts (email_domain);

CREATE TABLE lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX lists_key_unique ON lists (key);

CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  list_id uuid NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  status subscription_status NOT NULL DEFAULT 'subscribed',
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  source text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX subscriptions_contact_list_unique ON subscriptions (contact_id, list_id);
CREATE INDEX subscriptions_status_idx ON subscriptions (status);

CREATE TABLE suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  domain text,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  reason suppression_reason NOT NULL,
  description text,
  source text NOT NULL DEFAULT 'system',
  metadata jsonb NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  suppressed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX suppressions_email_idx ON suppressions (email);
CREATE INDEX suppressions_domain_idx ON suppressions (domain);
CREATE INDEX suppressions_active_idx ON suppressions (active);

CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX tags_key_unique ON tags (key);

CREATE TABLE contact_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'manual',
  metadata jsonb NOT NULL DEFAULT '{}',
  tagged_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX contact_tags_contact_tag_unique ON contact_tags (contact_id, tag_id);

CREATE TABLE drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  subject text NOT NULL,
  preview text,
  body_markdown text NOT NULL,
  template text NOT NULL DEFAULT 'default',
  from_email text,
  from_name text,
  reply_to text,
  status draft_status NOT NULL DEFAULT 'draft',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX drafts_status_idx ON drafts (status);

CREATE TABLE broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid REFERENCES drafts(id) ON DELETE SET NULL,
  name text NOT NULL,
  subject text NOT NULL,
  status broadcast_status NOT NULL DEFAULT 'draft',
  audience jsonb NOT NULL DEFAULT '{}',
  delivery_policy jsonb NOT NULL DEFAULT '{}',
  total_planned integer NOT NULL DEFAULT 0,
  total_sent integer NOT NULL DEFAULT 0,
  total_bounced integer NOT NULL DEFAULT 0,
  total_complained integer NOT NULL DEFAULT 0,
  total_unsubscribed integer NOT NULL DEFAULT 0,
  total_opened integer NOT NULL DEFAULT 0,
  total_clicked integer NOT NULL DEFAULT 0,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX broadcasts_status_idx ON broadcasts (status);
CREATE INDEX broadcasts_scheduled_at_idx ON broadcasts (scheduled_at);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid REFERENCES broadcasts(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'ses',
  provider_message_id text,
  to_email text NOT NULL,
  subject text NOT NULL,
  status message_status NOT NULL DEFAULT 'planned',
  send_rank integer NOT NULL DEFAULT 0,
  rank_reason text NOT NULL DEFAULT 'default',
  engagement_score integer NOT NULL DEFAULT 0,
  scheduled_at timestamptz NOT NULL,
  attempted_at timestamptz,
  sent_at timestamptz,
  error jsonb,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_broadcast_idx ON messages (broadcast_id);
CREATE INDEX messages_contact_idx ON messages (contact_id);
CREATE INDEX messages_status_scheduled_idx ON messages (status, scheduled_at);
CREATE INDEX messages_provider_message_idx ON messages (provider_message_id);

CREATE TABLE links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  broadcast_id uuid REFERENCES broadcasts(id) ON DELETE CASCADE,
  original_url text NOT NULL,
  link_index integer NOT NULL,
  link_text text,
  token_hash text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX links_token_hash_unique ON links (token_hash);
CREATE INDEX links_message_idx ON links (message_id);
CREATE INDEX links_broadcast_idx ON links (broadcast_id);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type event_type NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  broadcast_id uuid REFERENCES broadcasts(id) ON DELETE SET NULL,
  message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  link_id uuid REFERENCES links(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'system',
  idempotency_key text,
  user_agent text,
  ip_hash text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX events_idempotency_key_unique ON events (idempotency_key);
CREATE INDEX events_type_idx ON events (type);
CREATE INDEX events_contact_idx ON events (contact_id);
CREATE INDEX events_broadcast_idx ON events (broadcast_id);
CREATE INDEX events_message_idx ON events (message_id);
CREATE INDEX events_occurred_at_idx ON events (occurred_at);

CREATE TABLE webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  raw_payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX webhook_events_provider_event_unique
ON webhook_events (provider, provider_event_id);
CREATE INDEX webhook_events_processed_idx ON webhook_events (processed);

CREATE TABLE sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sequence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  draft_id uuid REFERENCES drafts(id) ON DELETE SET NULL,
  position integer NOT NULL,
  delay_minutes integer NOT NULL,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX sequence_steps_position_unique
ON sequence_steps (sequence_id, position);
