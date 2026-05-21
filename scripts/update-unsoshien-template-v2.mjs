// 実際の営業メール (資料請求対応) のトーンを参考に運送社長支援のテンプレを書き換える。
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CLIENT_ID = "da1044f2-fcde-4ab3-ba17-2f9ed77abb41";

const subject = "{{ai_subject_hint}} に関するご提案 — 株式会社運送社長支援より";

const body = `{{担当者名}} 様

お世話になります。
株式会社運送社長支援の松崎と申します。

{{ai_opening}}

弊社では、M&A を見据えた新規事業の立ち上げをテーマに【軽貨物運送事業】の構築支援サービス『ドラ顧問』をご案内しております。

この軽貨物事業は、いわば「コインランドリーのような手離れ経営」が可能で、限られた時間・人材でも収益化できる仕組みを整えております。

詳しくは WEB にてお時間をいただき、全体像や収益モデルについてご説明できれば幸いです。
添付の資料(『ドラ顧問』ご提案資料)もぜひご一読いただけますと幸甚です。

※初回ヒアリングの際に、場合によってお断りさせていただく可能性がある点、ご理解いただけますと幸いです。

ご興味ありましたら、以下リンクより簡単に日程調整いただけます。
▶ 日程調整はこちら(TimeRex)
　https://timerex.net/s/contact_unsoshien_4cde/94f20439

何かご不明点等ございましたらお気軽にご連絡ください。`;

const { data: tpl } = await supabase
  .from("email_templates")
  .select("id")
  .eq("client_id", CLIENT_ID)
  .eq("name", "AI ハイブリッド (Gemini)")
  .maybeSingle();

if (!tpl) throw new Error("テンプレが見つかりません");

const { error } = await supabase
  .from("email_templates")
  .update({ subject, body })
  .eq("id", tpl.id);
if (error) throw new Error(error.message);
console.log(`✓ template updated (id=${tpl.id})`);

console.log(`\n--- subject ---\n${subject}`);
console.log(`\n--- body (${body.length} chars) ---\n${body}`);
