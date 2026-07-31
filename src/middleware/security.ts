/**
 * Verifies that an incoming webhook POST really came from Meta, using the
 * X-Hub-Signature-256 header. Meta signs the raw request body with the
 * app secret using HMAC-SHA256; we recompute it and compare.
 *
 * IMPORTANT: this must run on the raw body text, before it's parsed as
 * JSON - re-serializing JSON can change byte-for-byte formatting and
 * break the signature check.
 */
export async function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  appSecret: string
): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;

  const expectedHex = signatureHeader.slice("sha256=".length);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(rawBody)
  );

  const computedHex = [...new Uint8Array(signatureBuffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return timingSafeEqual(computedHex, expectedHex);
}

/** Manual constant-time string comparison - Workers doesn't have Node's crypto.timingSafeEqual. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}