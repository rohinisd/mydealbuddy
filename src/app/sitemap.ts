import type { MetadataRoute } from "next";
import { getAllProducts } from "@/lib/products";

export const revalidate = 3600;

const STATIC_ROUTES = [
  "",
  "/shop",
  "/deals",
  "/about-us",
  "/contact",
  "/faqs",
  "/success-stories",
  "/returns",
  "/support",
  "/track-order",
  "/privacy-policy",
  "/terms-of-service",
  "/cookies-policy",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const products = await getAllProducts();

  // Only categories that actually have a product in them -- avoids submitting
  // thin/empty category pages to Google (the nav shows all categories, but
  // many of the 572 leaves have no CJ-synced stock yet).
  const categorySlugs = new Set<string>();
  for (const product of products) {
    for (const segment of product.categoryPath) categorySlugs.add(segment.slug);
  }

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.6,
  }));

  const categoryEntries: MetadataRoute.Sitemap = [...categorySlugs].map((slug) => ({
    url: `${siteUrl}/product-category/${slug}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${siteUrl}/product/${product.slug}`,
    changeFrequency: "daily",
    priority: 0.5,
  }));

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
