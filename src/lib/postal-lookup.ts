import "server-only";

/**
 * Real postal-code existence checking via Zippopotam.us (free, no API key).
 * Verified empirically (not from their docs, which weren't fetchable) against
 * a real, known-good postal code per country in src/data/countries.ts: these
 * are the ones that actually returned a match. Countries NOT in this set --
 * notably GB and CA -- return 404 from Zippopotam even for genuinely real
 * postal codes, so we must not treat "404" as "fake" for them; format-only
 * validation (src/lib/postal-codes.ts) is the fallback there.
 */
const SUPPORTED_COUNTRIES = new Set([
  "US", "MX", "FR", "DE", "IT", "ES", "PT", "BE", "CH", "AT", "SE", "NO", "DK",
  "FI", "IS", "PL", "CZ", "HU", "BG", "HR", "SI", "RU", "TR", "ZA", "IN", "PK",
  "BD", "MY", "TH", "PH", "AU", "NZ", "JP",
]);

/**
 * true = confirmed real, false = confirmed not a real assigned code (only for
 * SUPPORTED_COUNTRIES), null = can't verify (unsupported country, or the
 * lookup service errored/timed out) -- callers should not block on null.
 */
export async function verifyPostalCodeExists(countryCode: string, zip: string): Promise<boolean | null> {
  if (!SUPPORTED_COUNTRIES.has(countryCode)) return null;

  try {
    const res = await fetch(`https://api.zippopotam.us/${countryCode.toLowerCase()}/${encodeURIComponent(zip.trim())}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 404) return false;
    if (!res.ok) return null; // service error, not a validation failure -- don't block
    return true;
  } catch {
    return null; // network/timeout -- fail open, don't block on our lookup service being down
  }
}
