export interface MegaMenuColumn {
  heading: string;
  items: string[];
}

export interface NavCategory {
  label: string;
  href: string;
  hot?: boolean;
  columns?: MegaMenuColumn[];
}

export const NAV_CATEGORIES: NavCategory[] = [
  {
    label: "Auto & Home",
    href: "/product-category/auto-home",
    columns: [
      { heading: "Car Accessories", items: ["Dash Cams", "Car Care", "Interior", "Tyres & Care"] },
      { heading: "Home", items: ["Smart Home", "Tools", "Furniture", "Decor"] },
    ],
  },
  {
    label: "Electronics",
    href: "/product-category/electronics",
    columns: [
      { heading: "Devices", items: ["Headphones", "Smart Watches", "Chargers", "Speakers"] },
      { heading: "Deals", items: ["Under $25", "Under $50", "Clearance"] },
    ],
  },
  {
    label: "Fashion",
    href: "/product-category/fashion",
    columns: [
      { heading: "Wear", items: ["Everyday", "Accessories", "Footwear", "Bags"] },
    ],
  },
  {
    label: "Beauty",
    href: "/product-category/beauty-personal-care",
    columns: [
      { heading: "Beauty & Spas", items: ["Skincare", "Haircare", "Fragrance", "Wellness"] },
    ],
  },
  {
    label: "Health & Fitness",
    href: "/product-category/health-fitness",
    columns: [
      { heading: "Fitness", items: ["Equipment", "Supplements", "Recovery"] },
    ],
  },
  {
    label: "Home & Kitchen",
    href: "/product-category/home-kitchen",
    columns: [
      { heading: "Kitchen", items: ["Appliances", "Cookware", "Storage"] },
    ],
  },
  { label: "Deals", href: "/deals", hot: true },
];

export interface ProductCategory {
  slug: string;
  label: string;
}

/** Categories products can actually be assigned to (excludes the "Deals" nav shortcut, which is a badge, not a category). */
export const PRODUCT_CATEGORIES: ProductCategory[] = NAV_CATEGORIES.filter((c) =>
  c.href.startsWith("/product-category/")
).map((c) => ({ slug: c.href.replace("/product-category/", ""), label: c.label }));
