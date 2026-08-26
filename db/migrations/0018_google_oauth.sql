-- Google-only accounts have no password to hash.
ALTER TABLE customer ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE customer ADD COLUMN google_id TEXT UNIQUE;
