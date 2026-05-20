// AI ハイブリッド動作確認用テストデータをセットアップ。
// 実行: node --env-file=.env.local scripts/setup-ai-test.mjs

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_ID = "8359dce9-c2bf-4802-a386-7c11f384f8a5"; // info.unsoshien@gmail.com
const CLIENT_ID = "b7cedcdd-dac5-4363-87ea-cbfb62e7a99f"; // 株式会社テスト
const TEST_RECIPIENT = "yingrensongqi613@gmail.com";

// --- 1. 顧問先の from_email + 署名を設定 ---
const { error: clientErr } = await supabase
  .from("clients")
  .update({
    from_email: "onboarding@resend.dev",
    signature:
      "株式会社テスト\n営業担当: 田中\nE-mail: onboarding@resend.dev\n※本メールは AI ハイブリッド動作確認のテスト送信です"
  })
  .eq("id", CLIENT_ID);
if (clientErr) throw new Error(`clients update failed: ${clientErr.message}`);
console.log("✓ clients updated (from_email = onboarding@resend.dev)");

// --- 2. 既存テンプレを全て非アクティブ化 ---
const { error: deactErr } = await supabase
  .from("email_templates")
  .update({ active: false })
  .eq("client_id", CLIENT_ID);
if (deactErr) throw new Error(`templates deactivate failed: ${deactErr.message}`);
console.log("✓ existing templates deactivated");

// --- 3. AI ハイブリッドテンプレを追加 ---
const subject = "{{ai_subject_hint}}に関するご提案 — {{自社名}}より";
const body = `{{担当者名}} 様

突然のご連絡失礼いたします。{{自社名}}の田中と申します。

{{ai_opening}}

弊社では EC・ネット通販事業者様向けに、ラストワンマイル配送のコスト削減を支援するサービスを提供しております。導入企業様からは「配送コストが約 30% 削減できた」「翌日配達率が向上した」等のお声を多数いただいております。

もしご興味ありましたら、5 分ほどお時間いただいて簡単な事例集をお送りさせていただければと存じます。
お忙しいところ恐れ入りますが、ご検討いただけますと幸いです。`;

const { data: tplInserted, error: insertErr } = await supabase
  .from("email_templates")
  .insert({
    client_id: CLIENT_ID,
    name: "AI ハイブリッド (Gemini)",
    subject,
    body,
    active: true
  })
  .select()
  .single();
if (insertErr) throw new Error(`template insert failed: ${insertErr.message}`);
console.log(`✓ AI template inserted: id=${tplInserted.id}`);

// --- 4. テスト用コンタクトを upsert ---
const { data: contactRow, error: contactErr } = await supabase
  .from("contacts")
  .upsert(
    {
      user_id: USER_ID,
      client_id: CLIENT_ID,
      company_name: "株式会社AIテスト商事",
      industry: "EC・通販",
      person_name: "山田 太郎",
      email: TEST_RECIPIENT,
      note: "AI ハイブリッド動作確認用テスト送信先",
      status: "pending"
    },
    { onConflict: "client_id,email" }
  )
  .select()
  .single();
if (contactErr) throw new Error(`contact upsert failed: ${contactErr.message}`);
console.log(`✓ contact upserted: id=${contactRow.id} email=${contactRow.email}`);

console.log("\n--- ready to test ---");
console.log(`  login as : info.unsoshien@gmail.com`);
console.log(`  client   : 株式会社テスト`);
console.log(`  template : "AI ハイブリッド (Gemini)"  (id=${tplInserted.id})`);
console.log(`  contact  : ${contactRow.email}  (id=${contactRow.id})`);
console.log(`  recipient: ${TEST_RECIPIENT} (自分のメアド宛)`);
