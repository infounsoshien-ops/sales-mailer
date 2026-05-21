// 運送社長支援の署名と担当者名 (田中 → 松崎) を実情報に合わせて更新する。
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CLIENT_ID = "da1044f2-fcde-4ab3-ba17-2f9ed77abb41"; // 運送社長支援

// --- 1. 署名を更新 ---
const signature = [
  "──────────────────────────────",
  "松崎 應人",
  "株式会社運送社長支援",
  "",
  "本社",
  "〒220-0012",
  "神奈川県横浜市西区みなとみらい3丁目7-1",
  "オーシャンゲートみなとみらい We Work 10-145",
  "",
  "TEL : 03-4500-0723",
  "Phone : 080-7134-9686",
  "Email : takato@unsoshien.co.jp",
  "URL : http://unsoshien.co.jp",
  "──────────────────────────────",
].join("\n");

const { error: clientErr } = await supabase
  .from("clients")
  .update({ signature })
  .eq("id", CLIENT_ID);
if (clientErr) throw new Error(`clients update failed: ${clientErr.message}`);
console.log("✓ signature updated");

// --- 2. テンプレ本文の「田中」を「松崎」に置換 ---
const { data: tpl } = await supabase
  .from("email_templates")
  .select("id, body")
  .eq("client_id", CLIENT_ID)
  .eq("name", "AI ハイブリッド (Gemini)")
  .maybeSingle();

if (tpl) {
  const newBody = tpl.body.replace(/田中/g, "松崎");
  const { error } = await supabase
    .from("email_templates")
    .update({ body: newBody })
    .eq("id", tpl.id);
  if (error) throw new Error(`template update failed: ${error.message}`);
  console.log(`✓ template body updated (田中 → 松崎)`);
}

console.log("\n--- signature ---");
console.log(signature);
