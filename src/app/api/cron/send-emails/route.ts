import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendToContact } from "@/lib/send-flow";
import { nowInJst, isWeekend, isTimeReached } from "@/lib/time-jst";
import { sleep, randomDelay } from "@/lib/utils";

/**
 * 毎時走る Cron。**顧問先(clients)単位**で処理する:
 * 1. 土日スキップ判定
 * 2. send_time に達しているか
 * 3. 本日の送信数 < daily_limit か
 * 4. active=true か
 * 5. テンプレートが 1 つ以上 active か
 * これらをパスしたら、未送信の連絡先を 1 件送信する。
 *
 * Vercel Cron は Authorization: Bearer ${CRON_SECRET} を自動付与する。
 */

interface ClientRow {
  id: string;
  user_id: string;
  daily_limit: number;
  send_time: string;
  skip_weekends: boolean;
  active: boolean;
  from_email: string | null;
  name: string;
}

function isAuthorized(request: NextRequest): boolean {
  const header = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const jst = nowInJst();

  const { data: clientsData, error: cErr } = await supabase
    .from("clients")
    .select("id, user_id, daily_limit, send_time, skip_weekends, active, from_email, name");
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  const clients = (clientsData ?? []) as ClientRow[];

  const summary: {
    client_id: string;
    client_name: string;
    skipped_reason?: string;
    sent?: { contact_id: string; ok: boolean; error?: string };
  }[] = [];

  for (const c of clients) {
    if (!c.active) {
      summary.push({ client_id: c.id, client_name: c.name, skipped_reason: "無効化中" });
      continue;
    }
    if (!c.from_email) {
      summary.push({ client_id: c.id, client_name: c.name, skipped_reason: "送信元未設定" });
      continue;
    }
    if (c.skip_weekends && isWeekend(jst.dayOfWeek)) {
      summary.push({ client_id: c.id, client_name: c.name, skipped_reason: "土日スキップ" });
      continue;
    }
    if (!isTimeReached(jst.hhmm, c.send_time)) {
      summary.push({ client_id: c.id, client_name: c.name, skipped_reason: `送信時刻 ${c.send_time} 未到達` });
      continue;
    }

    // アクティブなテンプレが必要
    const { count: tplCount } = await supabase
      .from("email_templates")
      .select("id", { count: "exact", head: true })
      .eq("client_id", c.id)
      .eq("active", true);
    if (!tplCount) {
      summary.push({ client_id: c.id, client_name: c.name, skipped_reason: "有効テンプレなし" });
      continue;
    }

    // 本日の成功送信数
    const utcStart = jst.utcMidnightOfJstDay.toISOString();
    const { count: sentToday } = await supabase
      .from("email_logs")
      .select("id, contact:contacts!inner(client_id)", { count: "exact", head: true })
      .eq("contact.client_id", c.id)
      .is("error_message", null)
      .gte("sent_at", utcStart);
    if ((sentToday ?? 0) >= c.daily_limit) {
      summary.push({
        client_id: c.id,
        client_name: c.name,
        skipped_reason: `本日の上限 (${c.daily_limit}) 到達`
      });
      continue;
    }

    // 次の送信先(pending)
    const { data: next } = await supabase
      .from("contacts")
      .select("id")
      .eq("client_id", c.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!next) {
      summary.push({ client_id: c.id, client_name: c.name, skipped_reason: "pending 連絡先なし" });
      continue;
    }

    // GitHub Actions Cron で 1 時間に 1 回しか走らないので、
    // 「スパム判定回避用のランダム遅延」は短くて十分。Vercel Hobby の 60s 制約に収めるため
    // 0.5〜3 秒に圧縮 (元は 2〜15 秒で複数 client 処理時にタイムアウトしていた)。
    await sleep(randomDelay(500, 3_000));
    const result = await sendToContact(supabase, next.id, { maxRetries: 3 });
    summary.push({
      client_id: c.id,
      client_name: c.name,
      sent: { contact_id: next.id, ok: result.ok, error: result.error }
    });
  }

  return NextResponse.json({ ok: true, jst, processed: clients.length, summary });
}
