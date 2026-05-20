import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string {
  const s = process.env.CRON_SECRET;
  if (!s || s.length < 16) {
    // 開発時に未設定でもクラッシュさせない(本番では必ず CRON_SECRET を設定)
    return "dev-secret-not-for-production-use-only";
  }
  return s;
}

export function signContactId(contactId: string): string {
  return createHmac("sha256", getSecret()).update(contactId).digest("base64url");
}

export function verifyContactToken(contactId: string, token: string): boolean {
  const expected = signContactId(contactId);
  try {
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function buildUnsubscribeUrl(contactId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
  const token = signContactId(contactId);
  return `${base}/unsubscribe?c=${encodeURIComponent(contactId)}&t=${encodeURIComponent(token)}`;
}
