-- Frozen copy of the walk database as shipped at schema version 1
-- (iOS development build 8871de65, commit fcd055f). Never edit this file:
-- STORE-03 upgrades databases created from it with the current app code.
CREATE TABLE walk (
  account_id TEXT NOT NULL,
  id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, id)
);
CREATE TABLE walk_sample (
  account_id TEXT NOT NULL,
  walk_id TEXT NOT NULL,
  sequence INTEGER NOT NULL CHECK (sequence >= 0),
  segment INTEGER NOT NULL CHECK (segment >= 0),
  latitude REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  accuracy REAL NOT NULL CHECK (accuracy >= 0),
  recorded_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, walk_id, sequence),
  FOREIGN KEY (account_id, walk_id) REFERENCES walk(account_id, id)
);
CREATE TABLE walk_outbox (
  account_id TEXT NOT NULL,
  walk_id TEXT NOT NULL,
  finished_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, walk_id),
  FOREIGN KEY (account_id, walk_id) REFERENCES walk(account_id, id)
);
PRAGMA user_version = 1;
