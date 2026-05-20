/**
 * テンプレートのプレースホルダ差し込み。
 * 対応する変数:
 *  - {{会社名}} / {{company}}                送信先の company_name
 *  - {{担当者名}} / {{person}}               送信先の person_name(無ければ「ご担当者」)
 *  - {{業種}} / {{industry}}                 送信先の industry(無ければ空文字)
 *  - {{自社名}} / {{my_company}}             現在の顧問先名
 *  - {{ai_subject_hint}}                    Gemini が生成する件名ヒント (空 = テンプレのみ)
 *  - {{ai_opening}}                         Gemini が生成する書き出し1-2文 (空 = テンプレのみ)
 */

export interface RenderVars {
  company_name: string;
  person_name: string | null;
  industry: string | null;
  client_name: string;
  /** Gemini からの件名ヒント (使わないなら未指定で OK = 空文字に置換) */
  ai_subject_hint?: string | null;
  /** Gemini からの書き出し1-2文 (使わないなら未指定で OK = 空文字に置換) */
  ai_opening?: string | null;
}

/** テンプレに使える AI プレースホルダ一覧。 */
export const AI_PLACEHOLDERS = ["{{ai_subject_hint}}", "{{ai_opening}}"] as const;

/**
 * テンプレ (件名 + 本文) のどこかに AI プレースホルダがあるかチェック。
 * 含まれていれば Gemini を呼ぶ意思があると判定。
 */
export function templateUsesAI(template: { subject: string; body: string }): boolean {
  const combined = `${template.subject}\n${template.body}`;
  return AI_PLACEHOLDERS.some((p) => combined.includes(p));
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function renderTemplate(template: string, vars: RenderVars): string {
  const personName = (vars.person_name?.trim() || "ご担当者") + " 様";
  // 「{{担当者名}} 様」と書かれた場合の自動「様」二重付与を避けるため特別処理:
  // ユーザが「様」を書いていなければ末尾に付ける形にせず、変数値はそのままにする
  const map: Record<string, string> = {
    "{{会社名}}": vars.company_name,
    "{{company}}": vars.company_name,
    "{{担当者名}}": vars.person_name?.trim() || "ご担当者",
    "{{person}}": vars.person_name?.trim() || "ご担当者",
    "{{業種}}": vars.industry?.trim() || "",
    "{{industry}}": vars.industry?.trim() || "",
    "{{自社名}}": vars.client_name,
    "{{my_company}}": vars.client_name,
    "{{ai_subject_hint}}": vars.ai_subject_hint?.trim() || "",
    "{{ai_opening}}": vars.ai_opening?.trim() || ""
  };

  let result = template;
  for (const [key, value] of Object.entries(map)) {
    result = result.replace(new RegExp(escapeReg(key), "g"), value);
  }
  // 一応「person 様 様」みたいな崩れに対するフォールバック(変数自体が「ご担当者」になった + ユーザが「様」を付けた場合のみ)
  // → ユーザのテンプレ書き方を信頼するため、ここでは追加処理しない
  return result;
}

/** 一覧から無作為に 1 件を返す。空配列なら null */
export function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
}
