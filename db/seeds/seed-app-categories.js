// Seeds app_category from cj-categories.json (the client's exported CJ
// category tree) as a 3-level tree, with l1/l2/l3 slug+name denormalised
// onto every row -- see migration 0022_app_categories.sql for why.
//
// Run once after migration 0022 is applied, and again any time the client
// re-exports an updated category tree from CJ:
//   node db/seeds/seed-app-categories.js
//
// Safe to re-run: uses DELETE, not TRUNCATE. cj_product.app_category_id
// references this table -- TRUNCATE ... CASCADE would silently wipe
// cj_product (and everything chained off it: variants, images, videos,
// reviews, order line items) right along with it. This happened once
// during development; DELETE fails per-row instead if a category is
// actually still referenced by a product, rather than cascading.
require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env.local") });
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const data = JSON.parse(fs.readFileSync(path.join(__dirname, "cj-categories.json"), "utf8"));

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Guarantees uniqueness within a set of sibling slugs (appends -2, -3, ... on collision).
function uniqueSlug(base, usedSet) {
  let slug = base;
  let n = 2;
  while (usedSet.has(slug)) {
    slug = `${base}-${n}`;
    n++;
  }
  usedSet.add(slug);
  return slug;
}

(async () => {
  await pool.query("DELETE FROM app_category");
  await pool.query("ALTER SEQUENCE app_category_id_seq RESTART WITH 1");

  let l1Count = 0,
    l2Count = 0,
    l3Count = 0;

  for (const top of data.categories) {
    const l1UsedSlugs = new Set(); // scoped: root-level siblings
    const l1Slug = uniqueSlug(slugify(top.name), l1UsedSlugs);
    const l1FullSlug = l1Slug;

    const l1Res = await pool.query(
      `INSERT INTO app_category (level, parent_id, slug, name, l1_slug, l1_name, full_slug)
       VALUES (1, NULL, $1, $2, $1, $2, $3) RETURNING id`,
      [l1Slug, top.name, l1FullSlug]
    );
    const l1Id = l1Res.rows[0].id;
    l1Count++;

    const l2UsedSlugs = new Set(); // scoped: this L1's direct children
    for (const [groupName, leaves] of Object.entries(top.groups)) {
      const l2Slug = uniqueSlug(slugify(groupName), l2UsedSlugs);
      const l2FullSlug = `${l1FullSlug}/${l2Slug}`;

      const l2Res = await pool.query(
        `INSERT INTO app_category (level, parent_id, slug, name, l1_slug, l1_name, l2_slug, l2_name, full_slug)
         VALUES (2, $1, $2, $3, $4, $5, $2, $3, $6) RETURNING id`,
        [l1Id, l2Slug, groupName, l1Slug, top.name, l2FullSlug]
      );
      const l2Id = l2Res.rows[0].id;
      l2Count++;

      const l3UsedSlugs = new Set(); // scoped: this L2's direct children
      for (const leafName of leaves) {
        const l3Slug = uniqueSlug(slugify(leafName), l3UsedSlugs);
        const l3FullSlug = `${l2FullSlug}/${l3Slug}`;

        await pool.query(
          `INSERT INTO app_category (level, parent_id, slug, name, l1_slug, l1_name, l2_slug, l2_name, l3_slug, l3_name, full_slug)
           VALUES (3, $1, $2, $3, $4, $5, $6, $7, $2, $3, $8)`,
          [l2Id, l3Slug, leafName, l1Slug, top.name, l2Slug, groupName, l3FullSlug]
        );
        l3Count++;
      }
    }
  }

  console.log(`Seeded ${l1Count} L1, ${l2Count} L2, ${l3Count} L3 categories.`);
  await pool.end();
})().catch((err) => {
  console.error("SEED FAILED:", err);
  process.exit(1);
});
