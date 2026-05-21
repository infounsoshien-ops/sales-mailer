import { buildUnsubscribeUrl } from "./unsubscribe";

/**
 * Claude が生成した本文に、署名と配信停止リンクを足して送信用の最終本文を作る。
 * 特定電子メール法に準拠するため、必ず署名と配信停止リンクを末尾に含める。
 */
export function composeEmailBody({
  generatedBody,
  signature,
  contactId
}: {
  generatedBody: string;
  signature: string | null;
  contactId: string;
}): { text: string; html: string } {
  const unsubUrl = buildUnsubscribeUrl(contactId);
  const sig = (signature ?? "").trim();

  const text = [
    generatedBody.trim(),
    "",
    sig,
    "",
    "── このメールの配信停止 ─────────────────",
    "今後このメールが不要な場合は、以下のリンクをクリックしてください。",
    unsubUrl
  ]
    .filter(Boolean)
    .join("\n");

  // HTML 版(改行のみ <br>。スタイルは控えめに)
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // http(s) URL を <a> タグに自動変換 (受信側でクリック可能にするため)
  const linkify = (s: string) =>
    s.replace(
      /(https?:\/\/[^\s<>"'）)　]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
  const htmlBody = linkify(escape(generatedBody.trim())).replace(/\n/g, "<br>");
  const htmlSig = linkify(escape(sig)).replace(/\n/g, "<br>");

  // 文字サイズは Gmail の標準 (~13px) に合わせる。
  const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,'Hiragino Sans',Meiryo,Helvetica,Arial,sans-serif;color:#222;line-height:1.6;font-size:13px;margin:0;padding:0;">
<div style="max-width:640px;">
${htmlBody}
${sig ? `<div style="margin-top:20px;color:#555;">${htmlSig}</div>` : ""}
<div style="margin-top:24px;padding-top:12px;border-top:1px solid #ddd;color:#888;font-size:11px;">
今後このメールが不要な場合は <a href="${unsubUrl}" style="color:#888;">こちら</a> から配信停止できます。
</div>
</div>
</body></html>`;

  return { text, html };
}
