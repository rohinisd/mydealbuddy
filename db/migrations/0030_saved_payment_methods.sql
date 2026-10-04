-- Saved payment methods: the actual card data lives entirely on Stripe's
-- side (PCI scope stays off this app). We only need to remember which
-- Stripe Customer object belongs to which of our customers.
ALTER TABLE customer ADD COLUMN stripe_customer_id TEXT;
