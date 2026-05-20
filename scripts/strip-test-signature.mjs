// 全 client の signature から「※本メールは AI ハイブリッド動作確認のテスト送信です」の行を削除する。
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: clients, error } = await supabase
  .from("clients")
  .select("id, name, signature");
if (error) throw new Error(error.message);

for (const c of clients ?? []) {
  if (!c.signature) continue;
  const cleaned = c.signature
    .split("\n")
    .filter((line) => !/AI\s*ハイブリッド動作確認のテスト送信/.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (cleaned === c.signature) {
    console.log(`- ${c.name}: 変更なし`);
    continue;
  }
  const { error: ue } = await supabase
    .from("clients")
    .update({ signature: cleaned })
    .eq("id", c.id);
  if (ue) {
    console.error(`✗ ${c.name}: ${ue.message}`);
  } else {
    console.log(`✓ ${c.name}: テスト表記を削除`);
  }
}
