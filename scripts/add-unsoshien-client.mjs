// 「運送社長支援」顧問先 + AI ハイブリッドテンプレを追加する。
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_ID = "8359dce9-c2bf-4802-a386-7c11f384f8a5"; // info.unsoshien@gmail.com

// --- 1. 顧問先「運送社長支援」を作成 (既存なら更新) ---
const { data: existing } = await supabase
  .from("clients")
  .select("id")
  .eq("user_id", USER_ID)
  .eq("name", "運送社長支援")
  .maybeSingle();

let clientId = existing?.id;
if (!clientId) {
  const { data, error } = await supabase
    .from("clients")
    .insert({
      user_id: USER_ID,
      name: "運送社長支援",
      service_description:
        "軽貨物運送業の経営者向け業務支援サービス。ドライバー管理・売上管理・請求書発行などをWebアプリで一元化し、紙やExcel運用から脱却するDX支援を提供。",
      strengths:
        "軽貨物業界に特化した機能設計 / 月額制で導入コスト低 / 既存業務に即対応するシンプル UI",
      signature:
        "運送社長支援\n営業担当: 田中\nE-mail: onboarding@resend.dev\n※本メールは AI ハイブリッド動作確認のテスト送信です",
      from_email: "onboarding@resend.dev",
      daily_limit: 10,
      send_time: "10:00",
      skip_weekends: true,
      active: true,
    })
    .select()
    .single();
  if (error) throw new Error(`client insert failed: ${error.message}`);
  clientId = data.id;
  console.log(`✓ client created: ${clientId}`);
} else {
  console.log(`✓ client exists, skipping insert: ${clientId}`);
}

// --- 2. AI ハイブリッドテンプレ追加 ---
const { data: existingTpl } = await supabase
  .from("email_templates")
  .select("id")
  .eq("client_id", clientId)
  .eq("name", "AI ハイブリッド (Gemini)")
  .maybeSingle();

if (!existingTpl) {
  const subject = "{{ai_subject_hint}} に関するご提案 — 運送社長支援より";
  const body = `{{担当者名}} 様

突然のご連絡失礼いたします。運送社長支援の田中と申します。

{{ai_opening}}

弊社では軽貨物運送業の経営者向けに、ドライバー管理・売上管理・請求書発行などを一元化する Web サービスを提供しております。
紙や Excel で行っていた業務をすべてオンラインで完結でき、導入企業様からは「事務作業が 1/3 になった」「ドライバーの売上が一目で分かるようになった」等のお声を多数いただいております。

もしご興味ありましたら、5 分ほどお時間いただいて簡単なご紹介をさせていただければと存じます。
お忙しいところ恐れ入りますが、ご検討いただけますと幸いです。`;

  const { error } = await supabase.from("email_templates").insert({
    client_id: clientId,
    name: "AI ハイブリッド (Gemini)",
    subject,
    body,
    active: true,
  });
  if (error) throw new Error(`template insert failed: ${error.message}`);
  console.log(`✓ AI template inserted`);
} else {
  console.log(`✓ template exists, skipping`);
}

console.log(`\nclient_id=${clientId}`);
console.log(`次は AppShell コードを修正してデプロイ`);
