/**
 * ISO 3166-1 alpha-2 codes, used for the shipping-destination selector.
 * Scoped to the client's confirmed launch markets: US, Canada, Mexico, and
 * Europe. Was previously a much broader worldwide list -- CJ's freightCalculate
 * handles unsupported codes gracefully, but the client only wants these
 * regions offered at checkout, not just "no error on the rest."
 */
export const SHIPPING_COUNTRIES = [
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "MX", label: "Mexico" },
  { code: "GB", label: "United Kingdom" },
  { code: "IE", label: "Ireland" },
  { code: "FR", label: "France" },
  { code: "DE", label: "Germany" },
  { code: "IT", label: "Italy" },
  { code: "ES", label: "Spain" },
  { code: "PT", label: "Portugal" },
  { code: "NL", label: "Netherlands" },
  { code: "BE", label: "Belgium" },
  { code: "LU", label: "Luxembourg" },
  { code: "CH", label: "Switzerland" },
  { code: "AT", label: "Austria" },
  { code: "SE", label: "Sweden" },
  { code: "NO", label: "Norway" },
  { code: "DK", label: "Denmark" },
  { code: "FI", label: "Finland" },
  { code: "IS", label: "Iceland" },
  { code: "PL", label: "Poland" },
  { code: "CZ", label: "Czech Republic" },
  { code: "SK", label: "Slovakia" },
  { code: "HU", label: "Hungary" },
  { code: "RO", label: "Romania" },
  { code: "BG", label: "Bulgaria" },
  { code: "GR", label: "Greece" },
  { code: "HR", label: "Croatia" },
  { code: "SI", label: "Slovenia" },
  { code: "EE", label: "Estonia" },
  { code: "LV", label: "Latvia" },
  { code: "LT", label: "Lithuania" },
] as const;
