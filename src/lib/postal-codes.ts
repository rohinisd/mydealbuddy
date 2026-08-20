/**
 * CJ's freightCalculate does not validate postal codes at all -- verified
 * live: "00000", "abcde", and "1" all returned 25+ shipping options with
 * real-looking prices for a US destination. We have to reject obviously
 * invalid input ourselves before it ever reaches CJ.
 *
 * Patterns cover the countries in src/data/countries.ts. Anything not listed
 * falls back to a permissive generic check rather than blocking real input
 * we don't have a precise pattern for.
 */
const PATTERNS: Record<string, RegExp> = {
  US: /^\d{5}(-\d{4})?$/,
  CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
  MX: /^\d{5}$/,
  GB: /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/,
  IE: /^[A-Za-z]\d{2}[ -]?[A-Za-z0-9]{4}$/,
  FR: /^\d{5}$/,
  DE: /^\d{5}$/,
  IT: /^\d{5}$/,
  ES: /^\d{5}$/,
  PT: /^\d{4}-?\d{3}$/,
  NL: /^\d{4}\s?[A-Za-z]{2}$/,
  BE: /^\d{4}$/,
  LU: /^\d{4}$/,
  CH: /^\d{4}$/,
  AT: /^\d{4}$/,
  SE: /^\d{3}\s?\d{2}$/,
  NO: /^\d{4}$/,
  DK: /^\d{4}$/,
  FI: /^\d{5}$/,
  IS: /^\d{3}$/,
  PL: /^\d{2}-?\d{3}$/,
  CZ: /^\d{3}\s?\d{2}$/,
  SK: /^\d{3}\s?\d{2}$/,
  HU: /^\d{4}$/,
  RO: /^\d{6}$/,
  BG: /^\d{4}$/,
  GR: /^\d{3}\s?\d{2}$/,
  HR: /^\d{5}$/,
  SI: /^\d{4}$/,
  EE: /^\d{5}$/,
  LV: /^[Ll][Vv]-?\d{4}$/,
  LT: /^[Ll][Tt]-?\d{5}$/,
  UA: /^\d{5}$/,
  RU: /^\d{6}$/,
  TR: /^\d{5}$/,
  IL: /^\d{5,7}$/,
  AE: /^.{2,10}$/, // UAE has no formal postal code system
  SA: /^\d{5}$/,
  QA: /^.{0,10}$/, // Qatar has no postal codes
  KW: /^\d{5}$/,
  EG: /^\d{5}$/,
  ZA: /^\d{4}$/,
  NG: /^\d{6}$/,
  KE: /^\d{5}$/,
  MA: /^\d{5}$/,
  IN: /^\d{6}$/,
  PK: /^\d{5}$/,
  BD: /^\d{4}$/,
  LK: /^\d{5}$/,
  NP: /^\d{5}$/,
  CN: /^\d{6}$/,
  HK: /^.{0,10}$/, // Hong Kong has no postal codes
  TW: /^\d{3}(\d{2})?$/,
  JP: /^\d{3}-?\d{4}$/,
  KR: /^\d{5}$/,
  SG: /^\d{6}$/,
  MY: /^\d{5}$/,
  TH: /^\d{5}$/,
  VN: /^\d{5,6}$/,
  PH: /^\d{4}$/,
  ID: /^\d{5}$/,
  AU: /^\d{4}$/,
  NZ: /^\d{4}$/,
  BR: /^\d{5}-?\d{3}$/,
  AR: /^[A-Za-z]?\d{4}[A-Za-z]{0,3}$/,
  CL: /^\d{7}$/,
  CO: /^\d{6}$/,
  PE: /^\d{5}$/,
};

const FALLBACK = /^[A-Za-z0-9][A-Za-z0-9 -]{1,9}$/;

// Catches the "well-formed but obviously fake" gap format regex alone can't:
// verified live that "00000" passes the 5-digit US pattern even though it's
// not a real assigned ZIP. True existence checking needs a full postal
// database (a bigger feature); this just rejects the common fake patterns.
const ALL_SAME_DIGIT = /^(\d)\1+$/;

export function isValidPostalCode(countryCode: string, zip: string): boolean {
  const trimmed = zip.trim();
  if (!trimmed) return false;
  const digitsOnly = trimmed.replace(/[^0-9]/g, "");
  if (digitsOnly.length >= 4 && ALL_SAME_DIGIT.test(digitsOnly)) return false;
  const pattern = PATTERNS[countryCode] ?? FALLBACK;
  return pattern.test(trimmed);
}
