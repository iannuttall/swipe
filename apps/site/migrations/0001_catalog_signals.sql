PRAGMA foreign_keys = ON;

-- Public article copy stays in Astro Markdown. This table mirrors stable
-- identity and review dates so mutable signals can point at the right item.
CREATE TABLE IF NOT EXISTS catalog_entities (
  entity_key TEXT PRIMARY KEY,
  entity_kind TEXT NOT NULL
    CHECK (entity_kind IN ('tool', 'skill', 'workflow')),
  public_path TEXT,
  content_hash TEXT,
  first_seen_at TEXT NOT NULL,
  last_reviewed_at TEXT,
  next_review_at TEXT,
  last_material_change_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS catalog_entities_next_review
  ON catalog_entities(next_review_at);

CREATE INDEX IF NOT EXISTS catalog_entities_kind_review
  ON catalog_entities(entity_kind, next_review_at);

-- One row per real source review. receipt_path points to the private local
-- Radar evidence when one exists; the receipt itself does not belong in D1.
CREATE TABLE IF NOT EXISTS catalog_checks (
  check_id TEXT PRIMARY KEY,
  entity_key TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  source_revision TEXT,
  material_change INTEGER NOT NULL DEFAULT 0
    CHECK (material_change IN (0, 1)),
  verdict TEXT NOT NULL
    CHECK (verdict IN ('keep', 'update', 'retire', 'reject')),
  change_summary TEXT,
  receipt_path TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entity_key)
    REFERENCES catalog_entities(entity_key)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS catalog_checks_entity_date
  ON catalog_checks(entity_key, checked_at DESC);

-- This supports both catalogue tools and issue-only skills or workflows.
CREATE TABLE IF NOT EXISTS catalog_issue_features (
  issue_slug TEXT NOT NULL,
  entity_key TEXT NOT NULL,
  featured_at TEXT NOT NULL,
  issue_section TEXT NOT NULL
    CHECK (issue_section IN ('sponsor', 'tools', 'workflows', 'classifieds')),
  position INTEGER NOT NULL CHECK (position > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (issue_slug, entity_key),
  FOREIGN KEY (entity_key)
    REFERENCES catalog_entities(entity_key)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS catalog_issue_features_entity_date
  ON catalog_issue_features(entity_key, featured_at DESC);

-- Search interest, Hacker News activity, GitHub activity, reader votes, and
-- submissions are prompts to recheck an item. They are never editorial proof.
CREATE TABLE IF NOT EXISTS catalog_signals (
  signal_id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_key TEXT NOT NULL,
  signal_kind TEXT NOT NULL
    CHECK (
      signal_kind IN (
        'hacker_news',
        'github',
        'search_impression',
        'search_click',
        'reader_vote',
        'reader_submission',
        'manual'
      )
    ),
  signal_value REAL,
  source_url TEXT,
  source_payload TEXT,
  observed_at TEXT NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entity_key)
    REFERENCES catalog_entities(entity_key)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS catalog_signals_entity_date
  ON catalog_signals(entity_key, observed_at DESC);

CREATE INDEX IF NOT EXISTS catalog_signals_kind_date
  ON catalog_signals(signal_kind, observed_at DESC);

-- Store a one-way visitor identifier only. Never store a raw IP address or
-- email address to stop repeat votes.
CREATE TABLE IF NOT EXISTS catalog_votes (
  entity_key TEXT NOT NULL,
  voter_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (entity_key, voter_hash),
  FOREIGN KEY (entity_key)
    REFERENCES catalog_entities(entity_key)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS catalog_votes_date
  ON catalog_votes(created_at DESC);

-- Submissions can exist before Radar accepts or creates a catalogue entity.
CREATE TABLE IF NOT EXISTS catalog_submissions (
  submission_id TEXT PRIMARY KEY,
  submitted_url TEXT NOT NULL,
  normalized_url TEXT NOT NULL,
  submitted_name TEXT,
  submitted_note TEXT,
  submitter_hash TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewing', 'accepted', 'rejected', 'duplicate')),
  matched_entity_key TEXT,
  submitted_at TEXT NOT NULL,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (matched_entity_key)
    REFERENCES catalog_entities(entity_key)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS catalog_submissions_status_date
  ON catalog_submissions(status, submitted_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS catalog_submissions_open_url
  ON catalog_submissions(normalized_url)
  WHERE status IN ('new', 'reviewing');
