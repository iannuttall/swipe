CREATE TABLE contact_external_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_id text NOT NULL,
  label text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX contact_external_ids_provider_external_unique
  ON contact_external_ids (provider, external_id);
CREATE UNIQUE INDEX contact_external_ids_contact_provider_external_unique
  ON contact_external_ids (contact_id, provider, external_id);
CREATE INDEX contact_external_ids_contact_idx ON contact_external_ids (contact_id);
CREATE INDEX contact_external_ids_provider_idx ON contact_external_ids (provider);

CREATE TABLE purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'manual',
  external_id text,
  idempotency_key text,
  product_key text NOT NULL,
  product_name text,
  amount_cents bigint NOT NULL,
  currency text NOT NULL,
  purchased_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX purchases_provider_external_unique
  ON purchases (provider, external_id);
CREATE UNIQUE INDEX purchases_idempotency_key_unique
  ON purchases (idempotency_key);
CREATE INDEX purchases_contact_idx ON purchases (contact_id);
CREATE INDEX purchases_product_key_idx ON purchases (product_key);
CREATE INDEX purchases_purchased_at_idx ON purchases (purchased_at);

CREATE TABLE contact_value_rollups (
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  currency text NOT NULL,
  purchase_count integer NOT NULL DEFAULT 0,
  total_amount_cents bigint NOT NULL DEFAULT 0,
  first_purchased_at timestamptz,
  last_purchased_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, currency)
);
CREATE INDEX contact_value_rollups_currency_total_idx
  ON contact_value_rollups (currency, total_amount_cents);
