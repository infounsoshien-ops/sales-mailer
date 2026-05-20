/**
 * 顧問先 (client) ごとに 1 つの PDF 添付ファイルを管理するユーティリティ。
 *
 * - Supabase Storage バケット "client-attachments" 配下に保存
 * - パス規約: `{client_id}/attachment.pdf` (1 client 1 ファイル固定)
 * - private バケット、service_role_key 経由でのみアクセス
 */

import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "client-attachments";

function pathFor(clientId: string): string {
  return `${clientId}/attachment.pdf`;
}

/**
 * 顧問先に添付ファイルが登録されているかチェック (メタデータ取得)。
 */
export async function hasClientAttachment(clientId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(clientId, { limit: 1 });
  if (error) {
    console.warn(`[attachments] list failed: ${error.message}`);
    return false;
  }
  return (data ?? []).some((f) => f.name === "attachment.pdf");
}

/**
 * 添付ファイルを Buffer として取得 (送信時に Resend に渡す base64 化のため)。
 * ファイルが無ければ null。
 */
export async function downloadClientAttachment(
  clientId: string
): Promise<Buffer | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(pathFor(clientId));
  if (error || !data) {
    if (error && !/not\s*found/i.test(error.message)) {
      console.warn(`[attachments] download failed for ${clientId}: ${error.message}`);
    }
    return null;
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * PDF ファイルをアップロード (既存があれば上書き)。
 */
export async function uploadClientAttachment(
  clientId: string,
  file: Buffer | Uint8Array | Blob | ArrayBuffer
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(pathFor(clientId), file, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * 顧問先の添付ファイルを削除。
 */
export async function deleteClientAttachment(
  clientId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([pathFor(clientId)]);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * 送信時に使う「添付ファイルの base64 + ファイル名」を返す。
 * ファイルが無ければ null (添付なしで送信)。
 */
export async function getAttachmentForSend(
  clientId: string,
  clientName: string
): Promise<{ filename: string; content: string; contentType: string } | null> {
  const buf = await downloadClientAttachment(clientId);
  if (!buf) return null;
  const safeName = clientName.replace(/[\\/:*?"<>|]/g, "_").slice(0, 40);
  return {
    filename: `${safeName || "サービス資料"}.pdf`,
    content: buf.toString("base64"),
    contentType: "application/pdf",
  };
}
