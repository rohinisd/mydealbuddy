export interface AffiliateDeal {
  id: string;
  title: string;
  blurb: string;
  cta: string;
  href: string;
}

/** Manual affiliate/coupon-style deal cards — drive from a real data source in the rebuild. */
export const AFFILIATE_DEALS: AffiliateDeal[] = [
  {
    id: "dovly",
    title: "Dovly AI — Improve Your Credit Score",
    blurb: "Free credit monitoring with AI-powered dispute automation.",
    cta: "Get This Deal",
    href: "#",
  },
  {
    id: "swagbucks",
    title: "Swagbucks Cashback",
    blurb: "Earn cashback and rewards on everyday online shopping.",
    cta: "Join Now",
    href: "#",
  },
  {
    id: "rakuten",
    title: "Rakuten — Cash Back at 2,500+ Stores",
    blurb: "Get a percentage back on purchases at your favorite retailers.",
    cta: "Shop Now",
    href: "#",
  },
];
