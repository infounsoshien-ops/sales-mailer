import Papa from "papaparse";
import * as Encoding from "encoding-japanese";
import { z } from "zod";

/**
 * CSV の列を Contact フィールドにマップ。日本語・英語どちらのヘッダも受け付ける。
 */
const HEADER_MAP: Record<string, "company_name" | "industry" | "person_name" | "email" | "note"> = {
  会社名: "company_name",
  企業名: "company_name",
  company: "company_name",
  company_name: "company_name",
  業種: "industry",
  industry: "industry",
  担当者名: "person_name",
  担当者: "person_name",
  person_name: "person_name",
  メールアドレス: "email",
  メール: "email",
  email: "email",
  備考: "note",
  メモ: "note",
  note: "note"
};

const ContactRowSchema = z.object({
  company_name: z.string().min(1, "会社名は必須です").max(200),
  industry: z.string().max(100).optional().or(z.literal("").transform(() => undefined)),
  person_name: z.string().max(100).optional().or(z.literal("").transform(() => undefined)),
  email: z.string().email("メールアドレスの形式が不正です").max(200),
  note: z.string().max(2000).optional().or(z.literal("").transform(() => undefined))
});

export type ParsedContact = z.output<typeof ContactRowSchema>;

export interface CsvParseError {
  row: number; // 1-based, ヘッダ行を 1 とする
  message: string;
}

export interface CsvParseResult {
  rows: ParsedContact[];
  errors: CsvParseError[];
  encoding: "UTF8" | "SJIS" | "UNKNOWN";
}

/**
 * ArrayBuffer → UTF-8 文字列に変換(SJIS/UTF-8 自動判別)。
 */
export function decodeToUtf8(buffer: ArrayBuffer): { text: string; encoding: "UTF8" | "SJIS" | "UNKNOWN" } {
  const bytes = new Uint8Array(buffer);
  const detected = Encoding.detect(bytes);
  if (detected === "UTF8") {
    return { text: new TextDecoder("utf-8").decode(bytes), encoding: "UTF8" };
  }
  if (detected === "SJIS") {
    const unicodeArray = Encoding.convert(bytes, { to: "UNICODE", from: "SJIS" });
    return { text: Encoding.codeToString(unicodeArray), encoding: "SJIS" };
  }
  // 検出失敗時は UTF-8 として試行
  return { text: new TextDecoder("utf-8").decode(bytes), encoding: "UNKNOWN" };
}

/**
 * CSV テキストを Contact にパース・バリデーション。
 */
export function parseContactsCsv(text: string): CsvParseResult {
  const { data, errors: papaErrors, meta } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim()
  });

  const errors: CsvParseError[] = papaErrors.map((e) => ({
    row: (e.row ?? 0) + 2, // header=1, data starts at 2
    message: `CSV パースエラー: ${e.message}`
  }));

  // ヘッダ→DB列マッピング
  const headers = meta.fields ?? [];
  const headerMap = new Map<string, string>();
  for (const h of headers) {
    const mapped = HEADER_MAP[h];
    if (mapped) headerMap.set(h, mapped);
  }

  if (!headerMap.has) {
    /* unreachable, satisfies tsc */
  }

  // 必須列チェック
  const mappedColumns = Array.from(headerMap.values());
  if (!mappedColumns.includes("company_name")) {
    errors.push({ row: 1, message: "必須列「会社名 / company_name」がありません" });
  }
  if (!mappedColumns.includes("email")) {
    errors.push({ row: 1, message: "必須列「メールアドレス / email」がありません" });
  }

  const rows: ParsedContact[] = [];
  if (errors.some((e) => e.row === 1)) {
    return { rows, errors, encoding: "UTF8" };
  }

  data.forEach((raw, idx) => {
    const rowNum = idx + 2;
    const mapped: Record<string, string> = {};
    for (const [origKey, dbKey] of headerMap.entries()) {
      const v = raw[origKey];
      if (v !== undefined) mapped[dbKey] = String(v).trim();
    }
    const parsed = ContactRowSchema.safeParse(mapped);
    if (parsed.success) {
      rows.push(parsed.data);
    } else {
      parsed.error.errors.forEach((e) => {
        errors.push({ row: rowNum, message: `${e.path.join(".")} - ${e.message}` });
      });
    }
  });

  return { rows, errors, encoding: "UTF8" };
}
