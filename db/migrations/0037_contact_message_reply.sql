-- Lets admin reply to a contact message from within the app instead of
-- switching to their own inbox. Single reply per message (no threading) --
-- matches how every other admin tool here works, and Resend has no inbound
-- mail handling anyway, so a multi-turn thread couldn't capture a follow-up
-- from the customer even if we built one.
ALTER TABLE contact_message ADD COLUMN replied_at TIMESTAMPTZ;
ALTER TABLE contact_message ADD COLUMN reply_message TEXT;
