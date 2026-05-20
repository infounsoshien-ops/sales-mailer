import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendToContact } from "@/lib/send-flow";

const RequestSchema = z.object({
  contact_id: z.string().uuid()
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未ログインです" }, { status: 401 });
  }

  // 自分の連絡先かを確認(RLS でも弾かれるが API レベルでも明示)
  const { data: owns } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", parsed.data.contact_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!owns) {
    return NextResponse.json({ error: "送信先が見つかりません" }, { status: 404 });
  }

  const result = await sendToContact(supabase, parsed.data.contact_id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, resend_id: result.resendId });
}
