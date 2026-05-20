/**
 * Google Gemini API を使った "ハイブリッド" パーソナライズ生成。
 *
 * テンプレ全体を AI が書くのではなく、テンプレに埋め込む「件名のヒント」と
 * 「書き出し1-2文」だけを Gemini に作らせる方式。
 *
 * - 完全無料: AI Studio (aistudio.google.com) で発行する API キーを使う
 *   と、クレカ登録なしで 1日 1500 リクエストまで無料。
 * - クライアント (顧問先) の `service_description` + `strengths` と、
 *   送信先 contact の `company_name` / `industry` / `person_name` だけを渡す。
 *   スクレイピング等は不要。
 * - Structured Output (responseSchema) で JSON 形式を強制してパース失敗を防ぐ。
 */

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// gemini-2.5-flash は人気で 503 (overloaded) を返すことが多い。
// パーソナライズ用途には flash-lite で十分 (品質ほぼ同等・低レイテンシ・空きやすい)。
const MODEL = "gemini-2.5-flash-lite";

export interface PersonalizationInput {
  /** 送信先の会社名 */
  companyName: string;
  /** 送信先の業界 (不明なら null) */
  industry: string | null;
  /** 送信先の担当者名 (不明なら null) */
  personName: string | null;
  /** 自社の名前 (= 顧問先名) */
  myCompany: string;
  /** 自社のサービス概要 */
  myService: string;
  /** 自社の強み・特徴 (オプション) */
  myStrengths?: string | null;
  /** 相手会社の Web サイトから取得したテキスト (オプション、長すぎる場合は呼び出し側で切り詰めること) */
  siteContent?: string | null;
}

export interface PersonalizationOutput {
  /** 件名に差し込む短いフレーズ (10-20文字)。例: "貴社のSaaS事業" */
  subject_hint: string;
  /** 本文の書き出し1-2文 (50-150文字)。例: "貴社のWebサイトを拝見し..." */
  opening: string;
}

let cachedClient: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY が設定されていません。aistudio.google.com で発行して .env.local に設定してください。"
    );
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenerativeAI(apiKey);
  }
  return cachedClient;
}

/**
 * 環境変数に Gemini API キーが設定されているかチェック。
 * 設定されていなければ false (Gemini は呼ばずテンプレのみで送信する目的で使う)。
 */
export function isGeminiAvailable(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

const SYSTEM_INSTRUCTION = `あなたはBtoB営業メールのパーソナライズを担当するアシスタントです。
営業メール本文の中に差し込む「件名ヒント」と「書き出し文」を生成します。

ルール:
- 件名ヒント (subject_hint) は 10〜20文字程度。
  良い例: "貴社のSaaS事業", "貴社の物流業務", "貴社の採用活動"
  悪い例: 絵文字、誇大な表現、「!」連発
- 書き出し (opening) は 50〜150文字、1〜2文。
  相手会社の業界や名前に絡めた一言を入れる。売り込み口調にしない。
  サイト本文が与えられた場合は、そこに書かれた事業内容や特徴に具体的に触れること。
  良い例: "貴社のサービスサイトを拝見し、特に物流効率化への取り組みが印象的でした。"
  良い例: "貴社サイトに書かれた「創業80年の老舗としての伝統」と若手後継者の SNS 発信の取り組みが印象的でした。"
  悪い例: 自社の強みをいきなり並べる、長すぎる、誇張表現。
- 敬語で丁寧に。文末に「。」を付ける。
- 出力は必ず {"subject_hint":"...","opening":"..."} の JSON 形式。`;

/**
 * Gemini を呼んで件名ヒントと書き出しを生成する。
 *
 * 失敗時 (API エラー / パース失敗) は例外を throw する。
 * 呼び出し側で try/catch して "テンプレのみで送信" にフォールバックすること。
 */
export async function generatePersonalization(
  input: PersonalizationInput
): Promise<PersonalizationOutput> {
  const model = getClient().getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          subject_hint: { type: SchemaType.STRING },
          opening: { type: SchemaType.STRING }
        },
        required: ["subject_hint", "opening"]
      },
      // 日本語は 1 文字あたり 2-4 tokens 消費するので、150 文字 × 2 + JSON 構造で
      // 余裕を持って 2048 確保 (Flash の上限は 8192)。
      maxOutputTokens: 2048,
      temperature: 0.7
    }
  });

  const siteSection = input.siteContent?.trim()
    ? [
        "",
        "【相手企業の Web サイトから取得した本文 (要約・引用元)】",
        input.siteContent.trim().slice(0, 6000),
        "",
        "上記サイト本文の内容を参考に、相手企業の事業や取り組みに具体的に触れた opening を作ってください。"
      ].join("\n")
    : "";

  const prompt = [
    "【相手企業】",
    `会社名: ${input.companyName}`,
    `業界: ${input.industry?.trim() || "(不明)"}`,
    `担当者: ${input.personName?.trim() || "(不明)"}`,
    "",
    "【自社】",
    `会社名: ${input.myCompany}`,
    `サービス: ${input.myService || "(未設定)"}`,
    input.myStrengths?.trim() ? `強み: ${input.myStrengths}` : "",
    siteSection,
    "",
    "上記の情報を踏まえて、subject_hint と opening を JSON で返してください。"
  ]
    .filter(Boolean)
    .join("\n");

  // 503 / 429 (overloaded / rate-limited) は最大 2 回リトライ。
  // それ以外のエラーは即時 throw して呼び出し側のフォールバックに任せる。
  let result;
  for (let attempt = 1; ; attempt++) {
    try {
      result = await model.generateContent(prompt);
      break;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const transient = /\b(503|429|overload|temporar)/i.test(msg);
      if (!transient || attempt >= 2) throw e;
      // exponential backoff: 1s, 3s
      await new Promise((r) => setTimeout(r, attempt * 1000));
    }
  }
  const text = result.response.text().trim();
  if (!text) {
    throw new Error("Gemini が空のレスポンスを返しました");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(
      `Gemini の JSON パース失敗: ${e instanceof Error ? e.message : String(e)} / raw=${text.slice(0, 200)}`
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as { subject_hint?: unknown }).subject_hint !== "string" ||
    typeof (parsed as { opening?: unknown }).opening !== "string"
  ) {
    throw new Error(`Gemini の出力に subject_hint / opening が含まれていません: ${text.slice(0, 200)}`);
  }

  const out = parsed as PersonalizationOutput;
  return {
    subject_hint: out.subject_hint.trim(),
    opening: out.opening.trim()
  };
}
