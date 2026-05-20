import { createHmac, timingSafeEqual } from "crypto";

/**
 * Standard Webhooks 仕様(Svix 互換)に基づく署名検証。
 * Resend の webhook は Svix を使っているので、`whsec_` プレフィックス付きのシークレットを base64 デコードして HMAC-SHA256 で検証する。
 *
 * 期待ヘッダ:
 * - svix-id
 * - svix-timestamp
 * - svix-signature  ("v1,xxxxx v1,yyyyy" のように複数バージョンが空白区切りで並ぶ場合あり)
 */
export function verifySvixSignature(
  payload: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string
): boolean {
  if (!headers.id || !headers.timestamp || !headers.signature) return false;
  if (!secret) return false;

  // ヘッダのタイムスタンプが極端に古ければリプレイ攻撃と見なす(±5 分)
  const ts = parseInt(headers.timestamp, 10);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 5 * 60) return false;

  let secretBytes: Buffer;
  try {
    secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  } catch {
    return false;
  }

  const toSign = `${headers.id}.${headers.timestamp}.${payload}`;
  const expected = createHmac("sha256", secretBytes).update(toSign).digest("base64");

  // signature ヘッダは "v1,sig1 v1,sig2" のように複数を含むことがある
  const sigs = headers.signature
    .split(" ")
    .map((s) => s.split(",")[1])
    .filter(Boolean);

  for (const sig of sigs) {
    try {
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch {
      continue;
    }
  }
  return false;
}
