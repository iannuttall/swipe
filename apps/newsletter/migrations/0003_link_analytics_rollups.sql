CREATE TABLE link_rollups (
  link_id uuid PRIMARY KEY REFERENCES links(id) ON DELETE CASCADE,
  broadcast_id uuid REFERENCES broadcasts(id) ON DELETE CASCADE,
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  original_url text NOT NULL,
  link_index integer NOT NULL DEFAULT 0,
  url_host text,
  tags jsonb NOT NULL DEFAULT '[]',
  topics jsonb NOT NULL DEFAULT '[]',
  sponsor text,
  human_clicks integer NOT NULL DEFAULT 0,
  bot_clicks integer NOT NULL DEFAULT 0,
  unique_human_contacts integer NOT NULL DEFAULT 0,
  unique_bot_contacts integer NOT NULL DEFAULT 0,
  first_clicked_at timestamptz,
  last_clicked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX link_rollups_broadcast_idx ON link_rollups (broadcast_id);
CREATE INDEX link_rollups_url_host_idx ON link_rollups (url_host);
CREATE INDEX link_rollups_human_clicks_idx ON link_rollups (human_clicks);

CREATE TABLE contact_link_rollups (
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  link_id uuid NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  broadcast_id uuid REFERENCES broadcasts(id) ON DELETE CASCADE,
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  original_url text NOT NULL,
  link_index integer NOT NULL DEFAULT 0,
  url_host text,
  tags jsonb NOT NULL DEFAULT '[]',
  topics jsonb NOT NULL DEFAULT '[]',
  sponsor text,
  human_clicks integer NOT NULL DEFAULT 0,
  bot_clicks integer NOT NULL DEFAULT 0,
  first_clicked_at timestamptz,
  last_clicked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, link_id)
);
CREATE INDEX contact_link_rollups_contact_idx ON contact_link_rollups (contact_id);
CREATE INDEX contact_link_rollups_link_idx ON contact_link_rollups (link_id);
CREATE INDEX contact_link_rollups_broadcast_idx ON contact_link_rollups (broadcast_id);
CREATE INDEX contact_link_rollups_url_host_idx ON contact_link_rollups (url_host);
