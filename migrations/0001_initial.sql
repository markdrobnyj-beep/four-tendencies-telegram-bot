CREATE TABLE IF NOT EXISTS sessions (
  user_id INTEGER PRIMARY KEY,
  questions_json TEXT NOT NULL,
  answers_json TEXT NOT NULL,
  current_index INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  upholder INTEGER NOT NULL,
  obliger INTEGER NOT NULL,
  questioner INTEGER NOT NULL,
  rebel INTEGER NOT NULL,
  dominant TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS results_user_id_created_at
  ON results(user_id, created_at);

CREATE TABLE IF NOT EXISTS processed_updates (
  update_id INTEGER PRIMARY KEY,
  processed_at TEXT NOT NULL
);
