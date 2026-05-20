import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySvixSignature } from "@/lib/webhook-verify";

/**
 * Resend webhook 受信エンドポイント。
 * Resend Dashboard → Webhooks で `${NEXT_PUBLIC_APP_URL}/api/webhooks/resend` を登録し、
 * 取得した署名シークレットを `RESEND_WEBHOOK_SECRET` に設定すること。
 *
 * 反映するイベント:
 * - email.opened   → email_logs.opened_at をセット
 * - email.bounced  → email_logs.bounced=true、contacts.status='failed'
 * - email.delivery_delayed → email_logs.error_message に記録
 * - email.complained → contacts.status='unsubscribed'(スパム報告された場合)
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();

  const secret = process.env.RESEND_WEBHOOK_SECRET ?? "";
  const ok = verifySvixSignature(
    raw,
    {
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature")
    },
    secret
  );
  if (!ok) {
    return NextResponse.json({ error: "署名検証に失敗しました" }, { status: 401 });
  }

  let event: { type: string; data: Record<string, unknown> } | null = null;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "JSON パース失敗" }, { status: 400 });
  }
  if (!event || typeof event.type !== "string") {
    return NextResponse.json({ error: "イベント形式が不正です" }, { status: 400 });
  }

  const data = event.data as Record<string, unknown>;
  const resendId = (data.email_id as string) || (data.id as string) || null;
  if (!resendId) {
    return NextResponse.json({ ok: true, note: "email_id 不明、無視" });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "email.opened": {
      await supabase
        .from("email_logs")
        .update({ opened_at: new Date().toISOString() })
        .eq("resend_id", resendId)
        .is("opened_at", null);
      break;
    }
    case "email.bounced": {
      await supabase
        .from("email_logs")
        .update({ bounced: true, error_message: "Bounced" })
        .eq("resend_id", resendId);
      // 紐づく contact のステータスも failed に
      const { data: log } = await supabase
        .from("email_logs")
        .select("contact_id")
        .eq("resend_id", resendId)
        .maybeSingle();
      if (log?.contact_id) {
        await supabase
          .from("contacts")
          .update({ status: "failed" })
          .eq("id", log.contact_id);
      }
      break;
    }
    case "email.delivery_delayed": {
      await supabase
        .from("email_logs")
        .update({ error_message: "Delivery delayed" })
        .eq("resend_id", resendId);
      break;
    }
    case "email.complained": {
      const { data: log } = await supabase
        .from("email_logs")
        .select("contact_id")
        .eq("resend_id", resendId)
        .maybeSingle();
      if (log?.contact_id) {
        await supabase
          .from("contacts")
          .update({ status: "unsubscribed" })
          .eq("id", log.contact_id);
      }
      break;
    }
    default:
      // 未対応イベントは無視
      break;
  }

  return NextResponse.json({ ok: true });
}
