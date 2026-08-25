CREATE TABLE customer_address (
  id            BIGSERIAL PRIMARY KEY,
  customer_id   BIGINT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  label         TEXT,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  country_code  TEXT NOT NULL,
  country       TEXT NOT NULL,
  province      TEXT,
  city          TEXT NOT NULL,
  address_line  TEXT NOT NULL,
  zip           TEXT,
  is_default    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX customer_address_customer_id_idx ON customer_address (customer_id);
