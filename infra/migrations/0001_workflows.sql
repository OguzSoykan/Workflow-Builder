-- WB-014 (Data Model §2–4, ADR-019). Owner-scoped keys: another user's IDs never collide or leak.
CREATE TABLE users (
  firebase_uid TEXT PRIMARY KEY CHECK (length(firebase_uid) BETWEEN 1 AND 128),
  display_name TEXT CHECK (display_name IS NULL OR length(display_name) <= 100),
  preferred_locale TEXT NOT NULL DEFAULT 'tr' CHECK (preferred_locale IN ('tr', 'en')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE workflows (
  owner_uid TEXT NOT NULL REFERENCES users (firebase_uid),
  id TEXT NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  current_revision_number INTEGER NOT NULL CHECK (current_revision_number > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  PRIMARY KEY (owner_uid, id)
);
CREATE INDEX workflows_owner_updated ON workflows (owner_uid, deleted_at, updated_at DESC, id DESC);

-- Immutable snapshots; the unique key makes a second writer of the same revision fail.
CREATE TABLE workflow_revisions (
  owner_uid TEXT NOT NULL,
  workflow_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL CHECK (revision_number > 0),
  schema_version INTEGER NOT NULL CHECK (schema_version = 1),
  content_hash TEXT NOT NULL CHECK (length(content_hash) = 64),
  graph_json TEXT NOT NULL CHECK (length(graph_json) <= 262144),
  source TEXT NOT NULL CHECK (source IN ('manual', 'ai_create', 'ai_edit', 'import', 'restore')),
  created_by_uid TEXT NOT NULL REFERENCES users (firebase_uid),
  created_at TEXT NOT NULL,
  PRIMARY KEY (owner_uid, workflow_id, revision_number),
  FOREIGN KEY (owner_uid, workflow_id) REFERENCES workflows (owner_uid, id)
);
