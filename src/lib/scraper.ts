/**
 * 軽量スクレイパ。送信先 (contact) の Web サイトを 1 ページだけ fetch して、
 * 本文テキストを抽出 → Gemini に渡せる形に整形する。
 *
 * - 依存ゼロ (fetch + 正規表現ベースの HTML パース)
 * - timeout 8 秒、size 上限 2 MB
 * - script / style / nav / footer 等のノイズタグを除去
 * - 連続空白を圧縮し、上限 6000 文字で切り詰め (Gemini 無料枠の input 上限を考慮)
 */

const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_CHARS = 6000;

const STRIP_TAGS = [
  "script",
  "style",
  "noscript",
  "header",
  "nav",
  "footer",
  "form",
  "aside",
  "template",
  "iframe",
  "svg",
];

/**
 * 文字列の中から最初の http(s) URL を返す (なければ null)。
 * contact.note にメモと一緒に書かれた URL を抽出するために使う。
 */
export function extractFirstUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = input.match(/https?:\/\/[^\s<>"'）)]+/);
  return m ? m[0] : null;
}

/**
 * URL を fetch して本文テキストを抽出する。
 * 失敗時は null (呼び出し側で「スクレイピングなしで Gemini 呼ぶ」フォールバックさせる)。
 */
export async function fetchSiteContent(url: string): Promise<string | null> {
  if (!isSafeHttpUrl(url)) return null;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; sales-mailer-bot/1.0; +https://sales-mailer-rho.vercel.app)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en;q=0.9",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
  } catch (e) {
    console.warn(`[scraper] fetch failed for ${url}:`, e instanceof Error ? e.message : e);
    return null;
  }

  if (!res.ok) {
    console.warn(`[scraper] non-OK response ${res.status} for ${url}`);
    return null;
  }

  const ct = res.headers.get("content-type") || "";
  if (ct && !ct.includes("html")) {
    console.warn(`[scraper] skipping non-html content-type=${ct} for ${url}`);
    return null;
  }

  // Stream and truncate to MAX_BYTES.
  let html = "";
  const reader = res.body?.getReader();
  if (reader) {
    const decoder = new TextDecoder("utf-8", { fatal: false });
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (total > MAX_BYTES) {
        try {
          await reader.cancel();
        } catch {
          /* ignore */
        }
        break;
      }
    }
  } else {
    html = await res.text();
  }

  const text = extractText(html);
  if (!text) return null;
  return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;
}

/**
 * SSRF / 内部ネットワーク叩き対策。
 * http(s) スキームかつ private/loopback でないことだけチェック (簡易)。
 */
function isSafeHttpUrl(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return false;
  }
  // crude private-IP filter
  if (
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
    /^127\./.test(host) ||
    /^169\.254\./.test(host)
  ) {
    return false;
  }
  return true;
}

/** HTML から script/style/nav 等を除去し、テキストだけ抜き出す簡易抽出。 */
function extractText(html: string): string {
  let s = html;
  // remove HTML comments
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  // remove noisy block tags + contents
  for (const tag of STRIP_TAGS) {
    const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
    s = s.replace(re, " ");
    // self-closing/orphan opener
    s = s.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi"), " ");
  }
  // decode a few common entities
  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  // strip remaining tags
  s = s.replace(/<[^>]+>/g, " ");
  // collapse whitespace
  s = s.replace(/\s+/g, " ").trim();
  return s;
}
