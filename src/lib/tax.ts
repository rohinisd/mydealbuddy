import "server-only";

// Per the client's tax documents: NJ has one flat statewide rate with no
// city/county add-ons, applied to the merchandise subtotal (post-discount,
// pre-shipping) -- not to shipping itself. Every other state/country is $0
// until nexus expands beyond NJ.
const NJ_TAX_RATE = 0.06625;

// The checkout form's province field is free text, not a dropdown -- a New
// Jersey customer could type "NJ", "nj", "New Jersey", or with stray
// whitespace. Normalize rather than require an exact match.
function isNewJersey(province: string | undefined): boolean {
  const p = (province ?? "").trim().toLowerCase();
  return p === "nj" || p === "new jersey";
}

export function calculateTax(taxableAmount: number, countryCode: string, province: string | undefined): number {
  if (countryCode !== "US" || !isNewJersey(province)) return 0;
  return Math.round(taxableAmount * NJ_TAX_RATE * 100) / 100;
}
