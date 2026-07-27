ALTER TYPE contact_status ADD VALUE IF NOT EXISTS 'pending' BEFORE 'active';

ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'contact.confirmation_requested';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'contact.confirmed';

CREATE TYPE confirmation_purpose AS ENUM (
  'double_opt_in',
  'swipe_migration'
);

CREATE TYPE confirmation_status AS ENUM (
  'pending',
  'confirmed',
  'expired',
  'cancelled'
);

CREATE TABLE confirmation_requests (
  id uuid PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  purpose confirmation_purpose NOT NULL,
  batch_key text,
  token_hash text NOT NULL,
  status confirmation_status NOT NULL DEFAULT 'pending',
  source text NOT NULL,
  requested_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  confirmed_at timestamptz,
  confirmed_ip_hash text,
  confirmed_user_agent text,
  confirmed_source_url text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX confirmation_requests_token_hash_unique
  ON confirmation_requests (token_hash);

CREATE UNIQUE INDEX confirmation_requests_contact_purpose_batch_unique
  ON confirmation_requests (contact_id, purpose, batch_key)
  WHERE batch_key IS NOT NULL;

CREATE INDEX confirmation_requests_contact_purpose_idx
  ON confirmation_requests (contact_id, purpose);

CREATE INDEX confirmation_requests_batch_status_idx
  ON confirmation_requests (purpose, batch_key, status);

CREATE INDEX confirmation_requests_expires_idx
  ON confirmation_requests (expires_at);
