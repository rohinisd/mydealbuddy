CREATE TABLE customer (
  id                      BIGSERIAL PRIMARY KEY,
  email                   TEXT UNIQUE NOT NULL,
  password_hash           TEXT NOT NULL,
  first_name              TEXT NOT NULL,
  last_name               TEXT NOT NULL,
  email_verified_at       TIMESTAMPTZ,
  referral_code           TEXT UNIQUE NOT NULL,
  referred_by_customer_id BIGINT REFERENCES customer(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customer_session (
  token_hash   TEXT PRIMARY KEY,
  customer_id  BIGINT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX customer_session_customer_id_idx ON customer_session (customer_id);

CREATE TABLE customer_verification_token (
  token        TEXT PRIMARY KEY,
  customer_id  BIGINT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customer_order (
  id                      BIGSERIAL PRIMARY KEY,
  customer_id             BIGINT NOT NULL REFERENCES customer(id),
  order_number            TEXT UNIQUE NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'paid', 'cancelled')),
  subtotal                NUMERIC(10,2) NOT NULL,
  discount_amount         NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_amount         NUMERIC(10,2) NOT NULL DEFAULT 0,
  total                   NUMERIC(10,2) NOT NULL,
  buddy_coins_earned      INT NOT NULL DEFAULT 0,
  coupon_code             TEXT,
  shipping_name           TEXT NOT NULL,
  shipping_email          TEXT NOT NULL,
  shipping_country_code   TEXT NOT NULL,
  shipping_country        TEXT NOT NULL,
  shipping_province       TEXT,
  shipping_city           TEXT NOT NULL,
  shipping_address        TEXT NOT NULL,
  shipping_zip            TEXT,
  shipping_phone          TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX customer_order_customer_id_idx ON customer_order (customer_id);

CREATE TABLE customer_order_line (
  id            BIGSERIAL PRIMARY KEY,
  order_id      BIGINT NOT NULL REFERENCES customer_order(id) ON DELETE CASCADE,
  product_id    BIGINT NOT NULL REFERENCES cj_product(id),
  product_name  TEXT NOT NULL,
  option_label  TEXT,
  unit_price    NUMERIC(10,2) NOT NULL,
  quantity      INT NOT NULL
);
CREATE INDEX customer_order_line_order_id_idx ON customer_order_line (order_id);

-- Positive amount = earned, negative = redeemed. order_id is null for
-- non-purchase reasons (e.g. referral bonuses).
CREATE TABLE buddy_coin_ledger (
  id           BIGSERIAL PRIMARY KEY,
  customer_id  BIGINT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  amount       INT NOT NULL,
  reason       TEXT NOT NULL CHECK (reason IN ('purchase', 'referral_bonus', 'referred_signup_bonus')),
  order_id     BIGINT REFERENCES customer_order(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX buddy_coin_ledger_customer_id_idx ON buddy_coin_ledger (customer_id);
