/**
 * Claude に営業メールを書かせるためのプロンプト構築。
 * 自社情報部分は user_settings から、送信先情報は contacts から差し込む。
 */

export interface PromptArgs {
  ownCompanyName: string;
  ownServiceDescription: string;
  ownStrengths: string;
  targetCompanyName: string;
  targetIndustry: string | null;
  targetPersonName: string | null;
  emailTone: string;
}

export function buildSystemPrompt(): string {
  // 自社情報を含まないシステムプロンプト。プロンプトキャッシュが効きやすいよう構造化。
  return `あなたは日本の軽貨物運送会社の営業担当として、EC・ネット通販事業者へラストワンマイル配送サービスを提案する営業メールを作成します。

【鉄則】
- 押し売り感を出さない。相手のビジネス上のメリットから入る
- 件名は 30 文字以内、開封したくなる具体的なフック(数字や課題提示が効果的)
- 本文は 400〜600 文字。短すぎず、長すぎず
- 業界・会社名から相手の課題を推測し、それに応える形で価値を提示する
- 末尾で「15 分程度のオンライン面談」を控えめに、強要せず提案する
- 署名と配信停止リンクは別途付与されるので本文には含めない
- 「〜させていただきます」など過剰敬語は避け、ビジネス文書として自然な日本語にする
- 改行は適度に。読みやすい段落構成

【出力フォーマット】
必ず以下の JSON 形式のみを返してください。前後の説明や Markdown コードブロックは不要です。

{"subject": "件名(30文字以内)", "body": "本文(400-600文字)"}`;
}

export function buildUserPrompt(args: PromptArgs): string {
  const ownStrengths = args.ownStrengths.trim() || "(自社の強みは未設定)";
  const ownDesc = args.ownServiceDescription.trim() || "EC・ネット通販向けラストワンマイル配送";
  const targetIndustry = args.targetIndustry?.trim() || "(業種不明)";
  const targetPerson = args.targetPersonName?.trim() || "ご担当者";

  return `次の条件で営業メールを 1 通作成してください。

【自社】
- 会社名: ${args.ownCompanyName.trim() || "(自社の会社名は未設定)"}
- サービス: ${ownDesc}
- 強み: ${ownStrengths}

【送信先】
- 会社名: ${args.targetCompanyName.trim()}
- 業種: ${targetIndustry}
- 担当者名: ${targetPerson}

【トーン】
${args.emailTone}

JSON のみで返答してください。`;
}

/**
 * Claude のレスポンス文字列から {subject, body} を取り出す。
 * Markdown コードフェンスや前後の説明文に強い。
 */
export function parseEmailJson(text: string): { subject: string; body: string } {
  // ```json ... ``` を除去
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
  // 最初の `{` から最後の `}` までを抽出
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.slice(start, end + 1);
  }
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.subject === "string" && typeof parsed.body === "string") {
      return { subject: parsed.subject.trim(), body: parsed.body.trim() };
    }
  } catch {
    // fallthrough
  }
  throw new Error("Claude のレスポンスから件名/本文を取り出せませんでした");
}
