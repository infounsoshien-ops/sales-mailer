// Cron 自動送信のテストができる状態に整える:
// 1. sample*@example.com (架空アドレス) は status=failed にして cron が拾わないようにする
// 2. yingrensongqi613@gmail.com (両 client 分) は status=pending に戻す
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 1. 架空 sample アドレスを failed に
const { data: samples, error: e1 } = await supabase
  .from("contacts")
  .update({ status: "failed" })
  .like("email", "sample%@example.com")
  .select();
if (e1) throw new Error(e1.message);
console.log(`✓ ${samples.length} sample contacts → status=failed`);

// 2. yingrensongqi613 を pending に
const { data: real, error: e2 } = await supabase
  .from("contacts")
  .update({ status: "pending" })
  .eq("email", "yingrensongqi613@gmail.com")
  .select();
if (e2) throw new Error(e2.message);
console.log(`✓ ${real.length} real contacts → status=pending`);

console.log("\n次の cron 実行で yingrensongqi613@gmail.com 宛に送信されます。");
console.log("GitHub Actions → Run workflow で手動実行するか、定時 (平日 JST 10-19時毎時) を待つ。");
