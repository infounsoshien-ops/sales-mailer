/**
 * 連絡先 1 件に対する送信フロー。手動送信と Cron 自動送信の両方から使う。
 *
 * - 連絡先の所属顧問先のテンプレート(active=true)から無作為に 1 つ選択
 * - プレースホルダ({{会社名}} 等)を差し込み
 * - 署名 + 配信停止リンクを付与して送信
 * - email_logs にレコード作成
 * - contacts.status を 'sent' に更新
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAttachmentForSend } from "./client-attachments";
import { composeEmailBody } from "./email-format";
import { generatePersonalization, isGeminiAvailable } from "./gemini";
import { sendEmail } from "./resend";
import { extractFirstUrl, fetchSiteContent } from "./scraper";
import { renderTemplate, pickRandom, templateUsesAI } from "./template-render";

export interface SendFlowResult {
  ok: boolean;
  resendId?: string;
  error?: string;
  retryCount?: number;
  permanentlyFailed?: boolean;
}

export interface SendOptions {
  maxRetries?: number;
}

export async function sendToContact(
  supabase: SupabaseClient,
  contactId: string,
  options: SendOptions = {}
): Promise<SendFlowResult> {
  const maxRetries = options.maxRetries ?? 1;

  // 連絡先取得 (note にはメモまたは会社サイト URL が入る運用想定)
  const { data: contact, error: cErr } = await supabase
    .from("contacts")
    .select("id, user_id, client_id, company_name, industry, person_name, email, status, note")
    .eq("id", contactId)
    .single();
  if (cErr || !contact) {
    return { ok: false, error: "送信先が見つかりません" };
  }
  if (contact.status === "unsubscribed") {
    return { ok: false, error: "この送信先は配信停止になっています" };
  }
  if (contact.status === "sent") {
    return { ok: false, error: "この送信先には既に送信済みです" };
  }
  if (!contact.client_id) {
    return { ok: false, error: "この送信先には顧問先が割り当てられていません" };
  }

  // 顧問先情報取得 (AI パーソナライズに service_description / strengths も使う)
  const { data: client } = await supabase
    .from("clients")
    .select("id, name, signature, from_email, active, service_description, strengths")
    .eq("id", contact.client_id)
    .single();
  if (!client) return { ok: false, error: "顧問先情報が取得できません" };
  if (!client.active) return { ok: false, error: "この顧問先は無効化されています" };
  if (!client.from_email) {
    return { ok: false, error: "顧問先の送信元メールアドレスが未設定です" };
  }

  // テンプレ取得 → 無作為選択
  const { data: templates } = await supabase
    .from("email_templates")
    .select("subject, body")
    .eq("client_id", contact.client_id)
    .eq("active", true);
  const tpls = (templates ?? []) as { subject: string; body: string }[];
  const chosen = pickRandom(tpls);
  if (!chosen) {
    return { ok: false, error: "有効なテンプレートが 1 つもありません" };
  }

  // テンプレに AI プレースホルダがあって、かつ GEMINI_API_KEY が設定されていれば
  // Gemini を呼んで件名ヒント + 書き出しを生成する。
  // contact.note に http(s) URL が含まれていればそのサイトを軽量スクレイピング
  // して Gemini プロンプトに「相手会社の Web サイト本文」を渡す。
  // 失敗時はログだけ残してテンプレのみで送信 (= 安全フォールバック)。
  let aiSubjectHint = "";
  let aiOpening = "";
  if (templateUsesAI(chosen) && isGeminiAvailable()) {
    const siteUrl = extractFirstUrl(contact.note as string | null);
    let siteContent: string | null = null;
    if (siteUrl) {
      try {
        siteContent = await fetchSiteContent(siteUrl);
      } catch (e) {
        console.warn(
          `[send-flow] site scrape failed for ${siteUrl}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }
    try {
      const ai = await generatePersonalization({
        companyName: contact.company_name,
        industry: contact.industry as string | null,
        personName: contact.person_name as string | null,
        myCompany: client.name,
        myService: (client.service_description as string | null) ?? "",
        myStrengths: (client.strengths as string | null) ?? null,
        siteContent
      });
      aiSubjectHint = ai.subject_hint;
      aiOpening = ai.opening;
    } catch (e) {
      console.warn(
        `[send-flow] Gemini personalization failed for contact ${contact.id}, ` +
          `falling back to template-only: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  const renderVars = {
    company_name: contact.company_name,
    person_name: contact.person_name as string | null,
    industry: contact.industry as string | null,
    client_name: client.name,
    ai_subject_hint: aiSubjectHint,
    ai_opening: aiOpening
  };
  const subject = renderTemplate(chosen.subject, renderVars);
  const renderedBody = renderTemplate(chosen.body, renderVars);

  const { text, html } = composeEmailBody({
    generatedBody: renderedBody,
    signature: client.signature,
    contactId: contact.id
  });

  // この顧問先に PDF 添付ファイルが登録されていれば取得 (なければ null)。
  // Storage アクセスが失敗しても送信自体は止めない (添付なしで送る)。
  let attachment: { filename: string; content: string; contentType: string } | null = null;
  try {
    attachment = await getAttachmentForSend(client.id, client.name);
  } catch (e) {
    console.warn(
      `[send-flow] attachment fetch failed for client ${client.id}: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }

  let resendId: string;
  try {
    const sent = await sendEmail({
      from: client.from_email,
      to: contact.email,
      subject,
      text,
      html,
      tags: [
        { name: "contact_id", value: contact.id },
        { name: "client_id", value: client.id }
      ],
      attachments: attachment ? [attachment] : undefined
    });
    resendId = sent.id;
  } catch (e) {
    const message = e instanceof Error ? e.message : "送信失敗";
    const { data: lastLog } = await supabase
      .from("email_logs")
      .select("retry_count")
      .eq("contact_id", contact.id)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextRetryCount = (lastLog?.retry_count ?? 0) + 1;
    const permanentlyFailed = nextRetryCount >= maxRetries;

    await supabase.from("email_logs").insert({
      contact_id: contact.id,
      subject,
      body: text,
      error_message: message,
      bounced: false,
      retry_count: nextRetryCount
    });
    if (permanentlyFailed) {
      await supabase.from("contacts").update({ status: "failed" }).eq("id", contact.id);
    }
    return { ok: false, error: message, retryCount: nextRetryCount, permanentlyFailed };
  }

  await supabase.from("email_logs").insert({
    contact_id: contact.id,
    resend_id: resendId,
    subject,
    body: text,
    bounced: false,
    retry_count: 0
  });
  await supabase.from("contacts").update({ status: "sent" }).eq("id", contact.id);

  return { ok: true, resendId };
}
