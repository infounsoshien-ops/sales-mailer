// 運送社長支援の AI ハイブリッドテンプレを PDF 内容に合わせて更新する。
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CLIENT_ID = "da1044f2-fcde-4ab3-ba17-2f9ed77abb41"; // 運送社長支援

const subject = "{{ai_subject_hint}} に関するご提案 — 運送社長支援より";

const body = `{{担当者名}} 様

突然のご連絡失礼いたします。
株式会社運送社長支援の田中と申します。

{{ai_opening}}

弊社は、軽貨物運送業界・一般貨物自動車運送業界に特化した経営支援サービス『ドラ顧問』を提供しております。
FC(フランチャイズ)のような看板貸しやロイヤリティーは一切いただかず、顧問契約方式によりお客様が完全オーナー社長として独自経営を行いながら、新規事業の立ち上げから取引先紹介・採用支援・経営戦略までをワンストップでサポートいたします。

【ドラ顧問の特徴】
・3か月で経常利益50万円達成の実績
・1年目で営業利益月158万円の試算実績(関東圏稼働23名想定)
・ストック収益型ビジネスで毎月安定的に積み上がる経営
・基本業務は「採用活動」のみ。取引先繋ぎ・営業資料・契約書類一式は弊社が提供
・初月に公式LINE(リッチメニュー含む)と Instagram の設計を無料納品
・LINE / チャットワークで常時相談可能、月1回の Zoom 打合せ
・神奈川県横浜市(本店)・静岡県沼津市(支社)を拠点に全国対応

詳細は添付の資料(『ドラ顧問』ご提案資料)をご覧いただけますと幸甚です。
もしご興味ありましたら、5分ほどお時間いただいて Zoom での簡単なご紹介もさせていただければと存じます。

お忙しいところ恐れ入りますが、ご検討いただけますと幸いです。`;

// 既存の運送社長支援用 AI テンプレを更新 (なければ新規作成)
const { data: existing } = await supabase
  .from("email_templates")
  .select("id")
  .eq("client_id", CLIENT_ID)
  .eq("name", "AI ハイブリッド (Gemini)")
  .maybeSingle();

if (existing) {
  const { error } = await supabase
    .from("email_templates")
    .update({ subject, body, active: true })
    .eq("id", existing.id);
  if (error) throw new Error(error.message);
  console.log(`✓ template updated: id=${existing.id}`);
} else {
  const { data, error } = await supabase
    .from("email_templates")
    .insert({
      client_id: CLIENT_ID,
      name: "AI ハイブリッド (Gemini)",
      subject,
      body,
      active: true,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  console.log(`✓ template created: id=${data.id}`);
}

console.log(`\n--- subject ---\n${subject}`);
console.log(`\n--- body (${body.length} chars) ---\n${body}`);
