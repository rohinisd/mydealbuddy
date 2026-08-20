-- CJ Dropshipping product catalog schema.
-- Source: CJ_data_shape_report.md section 7, captured from real productDetailData
-- payloads + the public CJ API (developers.cjdropshipping.com/api2.0/v1).

-- suppliers -----------------------------------------------------------------
CREATE TABLE cj_supplier (
  id                BIGSERIAL PRIMARY KEY,
  cj_supplier_id    VARCHAR(64),          -- sentinel-prone: 7777/9999. NOT unique.
  company_name      TEXT,
  store_name        TEXT,                 -- the closest thing to a "brand"
  country_code      CHAR(2),
  region            TEXT,
  years_on_cj       INT,
  staff_count       INT,
  rating            NUMERIC(3,2),
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- categories ----------------------------------------------------------------
CREATE TABLE cj_category (
  cj_category_id    VARCHAR(64) PRIMARY KEY,   -- snowflake OR guid
  name              TEXT NOT NULL,
  level             SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 3),
  parent_id         VARCHAR(64) REFERENCES cj_category(cj_category_id)
);

-- products --------------------------------------------------------------------
CREATE TABLE cj_product (
  id                  BIGSERIAL PRIMARY KEY,
  pid                 VARCHAR(64) UNIQUE NOT NULL,   -- productDetailData.id / API pid
  spu                 VARCHAR(64),                   -- .sku / productSku
  name_en             TEXT NOT NULL,
  name_cn             TEXT,
  description_html    TEXT,                          -- HTML, sanitise before render
  selling_points_html TEXT,                          -- xiaoShouJianYi
  hs_code             VARCHAR(20),
  main_image_url      TEXT,
  category_l1_id      VARCHAR(64) REFERENCES cj_category(cj_category_id),
  category_l2_id      VARCHAR(64) REFERENCES cj_category(cj_category_id),
  category_l3_id      VARCHAR(64) REFERENCES cj_category(cj_category_id),
  supplier_id         BIGINT REFERENCES cj_supplier(id),
  currency            CHAR(3) DEFAULT 'USD',
  price_min           NUMERIC(12,2),                 -- computed from variants
  price_max           NUMERIC(12,2),
  discount_rate_pct   INT,                           -- negative = % off
  weight_min_g        NUMERIC(10,2),
  weight_max_g        NUMERIC(10,2),
  pack_weight_min_g   NUMERIC(10,2),
  pack_weight_max_g   NUMERIC(10,2),
  variant_axis_names  TEXT[],                        -- ['Color','Size']
  packing_key         VARCHAR(32),
  listed_count        INT,
  order_count         INT,
  quality_dispute_pct NUMERIC(6,2),
  min_order_qty       INT DEFAULT 1,
  is_pod              BOOLEAN DEFAULT false,
  wholesale_disabled  BOOLEAN DEFAULT false,         -- wholesaleOff
  sold_out            BOOLEAN DEFAULT false,
  verified_warehouse  SMALLINT,
  cj_price_updated_at TIMESTAMPTZ,
  raw_expand_field    JSONB,                         -- free-form; DO NOT columnise
  raw_payload         JSONB,                         -- keep the whole thing
  fetched_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- material / property are multi-valued -> link tables
CREATE TABLE cj_attribute_term (
  id     BIGSERIAL PRIMARY KEY,
  kind   TEXT NOT NULL CHECK (kind IN ('material','property','packing')),
  key    TEXT NOT NULL,        -- METAL, COMMON, THIN, PLASTIC_BAG
  name_en TEXT, name_cn TEXT,
  UNIQUE (kind, key)
);
CREATE TABLE cj_product_attribute (
  product_id BIGINT REFERENCES cj_product(id) ON DELETE CASCADE,
  term_id    BIGINT REFERENCES cj_attribute_term(id),
  PRIMARY KEY (product_id, term_id)
);

-- media -----------------------------------------------------------------------
CREATE TABLE cj_product_image (
  id           BIGSERIAL PRIMARY KEY,
  product_id   BIGINT NOT NULL REFERENCES cj_product(id) ON DELETE CASCADE,
  position     INT NOT NULL,          -- gallery order
  url          TEXT NOT NULL,
  url_path     TEXT NOT NULL,         -- url minus query string, for dedupe
  bid          VARCHAR(64),           -- the ?bid= variant, if any
  UNIQUE (product_id, position)
);
CREATE INDEX ON cj_product_image (product_id, url_path);

CREATE TABLE cj_product_video (
  id                 BIGSERIAL PRIMARY KEY,
  product_id         BIGINT NOT NULL REFERENCES cj_product(id) ON DELETE CASCADE,
  cj_video_id        VARCHAR(64),
  video_number       VARCHAR(64),
  url                TEXT, cover_url TEXT,
  width INT, height INT, duration_s NUMERIC(8,3), size_bytes BIGINT,
  is_free BOOLEAN, is_buy BOOLEAN, copyright_price NUMERIC(10,2),
  not_copyright_price NUMERIC(10,2), video_type SMALLINT,
  UNIQUE (product_id, cj_video_id)
);

-- variants ----------------------------------------------------------------------
CREATE TABLE cj_variant (
  id                BIGSERIAL PRIMARY KEY,
  product_id        BIGINT NOT NULL REFERENCES cj_product(id) ON DELETE CASCADE,
  vid               VARCHAR(64) UNIQUE NOT NULL,
  variant_sku       VARCHAR(64) NOT NULL,
  variant_name_en   TEXT,
  variant_key_raw   TEXT,            -- 'Black Zone8 Set-2XL' -- keep verbatim
  attributes        JSONB,           -- {"Color":"Black Zone8 Set","Size":"2XL"}
  barcode           VARCHAR(32),
  barcode2          VARCHAR(32),
  cost_price        NUMERIC(12,2),   -- sellPrice / variantSellPrice
  discount_price    NUMERIC(12,2),   -- nowPrice, NULL when absent ('' -> NULL)
  suggested_retail  NUMERIC(12,2),   -- retailPrice / variantSugSellPrice
  price_ratio       NUMERIC(8,2),
  weight_g          NUMERIC(10,2),
  pack_weight_g     NUMERIC(10,2),
  length_mm         NUMERIC(10,2),   -- canonicalise to mm
  width_mm          NUMERIC(10,2),
  height_mm         NUMERIC(10,2),
  volume_mm3        NUMERIC(14,2),
  is_combine        BOOLEAN DEFAULT false,   -- pack/bundle variants
  image_url         TEXT,
  dispute_rate_pct  NUMERIC(6,2),
  order_count       INT,
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON cj_variant (product_id);

-- tiered pricing (three tables collapsed into one, discriminated) --------------
CREATE TABLE cj_variant_price_tier (
  id          BIGSERIAL PRIMARY KEY,
  variant_id  BIGINT NOT NULL REFERENCES cj_variant(id) ON DELETE CASCADE,
  scheme      TEXT NOT NULL CHECK (scheme IN ('trade','cj_wholesale','direct_wholesale')),
  min_qty     INT NOT NULL,
  max_qty     INT,
  unit_price  NUMERIC(12,2) NOT NULL,
  discount_price NUMERIC(12,2),
  UNIQUE (variant_id, scheme, min_qty)
);

-- inventory: snapshot, one row per (variant, warehouse country) ----------------
CREATE TABLE cj_variant_inventory (
  id                 BIGSERIAL PRIMARY KEY,
  vid                VARCHAR(64) NOT NULL,       -- NOT an FK: orphan vids exist
  variant_id         BIGINT REFERENCES cj_variant(id) ON DELETE SET NULL,
  country_code       CHAR(2) NOT NULL,
  warehouse_area_id  VARCHAR(32),
  warehouse_name_en  TEXT,                       -- 'China Warehouse', from API
  total_inventory    INT,
  cj_inventory       INT,
  factory_inventory  INT,
  verified_warehouse SMALLINT,
  fetched_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vid, country_code, fetched_at)
);

-- shipping quotes: a cache, never a product attribute ---------------------------
CREATE TABLE cj_shipping_quote (
  id                  BIGSERIAL PRIMARY KEY,
  vid                 VARCHAR(64) NOT NULL,
  quantity            INT NOT NULL DEFAULT 1,
  from_country        CHAR(2) NOT NULL,
  to_country          CHAR(2) NOT NULL,
  to_postcode         VARCHAR(16),
  platform            TEXT,                       -- method availability varies by channel
  method_name         TEXT NOT NULL,              -- 'YunExpress Sensitive'
  total_cost          NUMERIC(12,2) NOT NULL,
  stock_fee           NUMERIC(12,2),              -- overseas-warehouse model only
  last_mile_fee       NUMERIC(12,2),              -- overseas-warehouse model only
  delivery_text       TEXT NOT NULL,              -- '4-7 d (62%) / 8-9 d (29%) / 10+ d (9%)'
  delivery_min_days   INT,
  delivery_max_days   INT,
  is_available        BOOLEAN DEFAULT true,
  note                TEXT,                       -- 'not available for TikTok and Temu'
  fetched_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at          TIMESTAMPTZ
);
CREATE INDEX ON cj_shipping_quote (vid, to_country, quantity, fetched_at DESC);

-- reviews -----------------------------------------------------------------------
CREATE TABLE cj_product_review (
  id             BIGSERIAL PRIMARY KEY,
  product_id     BIGINT NOT NULL REFERENCES cj_product(id) ON DELETE CASCADE,
  cj_comment_id  BIGINT UNIQUE,
  author_masked  TEXT,                -- 'M***t'
  score          SMALLINT,            -- API only; NULL from web scrape
  body           TEXT,
  country_code   CHAR(2),
  image_urls     TEXT[],
  source         TEXT,                -- 'From third-party'
  commented_at   TIMESTAMPTZ
);

-- certifications & label services ------------------------------------------------
CREATE TABLE cj_product_certification (
  product_id  BIGINT REFERENCES cj_product(id) ON DELETE CASCADE,
  config_id   VARCHAR(32),
  name_en     TEXT, abbrev VARCHAR(16), image_url TEXT, sort INT,
  PRIMARY KEY (product_id, config_id)
);
CREATE TABLE cj_product_label_config (
  product_id     BIGINT REFERENCES cj_product(id) ON DELETE CASCADE,
  label_type     TEXT CHECK (label_type IN ('CUT_LABEL','CHANGE_LABEL')),
  amount         NUMERIC(10,2),
  standard_amount NUMERIC(10,2),
  option_values  TEXT[],
  PRIMARY KEY (product_id, label_type)
);

-- sales-channel recommendations ---------------------------------------------------
CREATE TABLE cj_product_zone (
  product_id     BIGINT REFERENCES cj_product(id) ON DELETE CASCADE,
  zone_id        VARCHAR(32),
  zone_detail_id VARCHAR(64),
  zone_platform  TEXT,          -- 'tiktok_us_cross', 'shopify', …
  url            TEXT,
  PRIMARY KEY (product_id, zone_detail_id)
);
