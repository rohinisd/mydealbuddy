-- Real contact-form submissions. Saved here first, before attempting the
-- notification email, so a message is never lost even if Resend is briefly
-- down -- email_sent tracks whether the notification actually went out.
CREATE TABLE contact_message (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT,
  message    TEXT NOT NULL,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX contact_message_created_at_idx ON contact_message (created_at DESC);
