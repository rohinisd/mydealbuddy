-- Guest checkout: an order no longer requires an account. Buddy Coins/referral
-- crediting stays account-only (there's nowhere to credit a guest), enforced
-- in application code, not the schema.
ALTER TABLE customer_order ALTER COLUMN customer_id DROP NOT NULL;
