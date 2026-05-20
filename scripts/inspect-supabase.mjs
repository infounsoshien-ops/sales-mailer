// 既存の Supabase データ状況を一覧する開発用スクリプト。
// 実行: node --env-file=.env.local scripts/inspect-supabase.mjs

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: users, error: userErr } = await supabase.auth.admin.listUsers();
if (userErr) {
  console.error("auth.users error:", userErr);
} else {
  console.log("=== auth.users ===");
  for (const u of users.users) {
    console.log(`  ${u.id}  ${u.email}  (created ${u.created_at})`);
  }
}

const tables = ["clients", "email_templates", "contacts", "email_logs"];
for (const t of tables) {
  const { count, error: ce } = await supabase
    .from(t)
    .select("*", { count: "exact", head: true });
  if (ce) {
    console.log(`=== ${t} === ERROR: ${ce.message}`);
    continue;
  }
  console.log(`=== ${t} === count=${count}`);
  if (count && count > 0) {
    const { data } = await supabase.from(t).select("*").limit(5);
    for (const row of data ?? []) {
      console.log(`  ${JSON.stringify(row).slice(0, 200)}`);
    }
  }
}
