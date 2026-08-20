CREATE TABLE coupon (
  id                BIGSERIAL PRIMARY KEY,
  code              TEXT UNIQUE NOT NULL,
  discount_type     TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value    NUMERIC(10,2) NOT NULL,
  min_order_value   NUMERIC(10,2),
  max_uses          INT,
  times_used        INT NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
