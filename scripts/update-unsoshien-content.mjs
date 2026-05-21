// PDF 資料の内容を反映して「運送社長支援」client の service_description / strengths を更新する。
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CLIENT_ID = "da1044f2-fcde-4ab3-ba17-2f9ed77abb41"; // 運送社長支援

const service_description =
  "軽貨物運送業界・一般貨物自動車運送業界に特化したワンストップの経営支援サービス『ドラ顧問』。" +
  "FC(フランチャイズ)ではなく顧問契約方式を採用し、お客様が完全オーナー社長として独自経営を行いながら、" +
  "新規事業の立ち上げから取引先紹介・採用サポート・経営戦略・SNS設計・各種書類提供までをワンストップで支援。" +
  "1年目で営業利益月158万円・3か月で経常利益50万円達成の実績あり。";

const strengths = [
  "■ 国内唯一の物流業界特化ワンストップ経営支援",
  "  軽貨物運送業界と一般貨物自動車運送業界に絞って蓄積した、先鋭されたノウハウを提供。",
  "  アプリ開発 / SNS運用代行 / 軽貨物運送事業 / 顧問事業 / 採用問題の解決 / 経営支援を一気通貫で提供。",
  "",
  "■ FC(フランチャイズ)ではなく顧問契約方式",
  "  ロイヤリティー(売上%上納)なし。完全オーナー社長として独自経営、本部専属契約や看板貸しではない。",
  "  顧問契約:150万円(税抜) + 月額顧問料2万5千円(税抜)。",
  "",
  "■ ストック収益型の安定ビジネスモデル",
  "  ショット型ではなく毎月積み上がるストック収益。",
  "  関東圏ドライバー1名あたり粗利69,000円(関西46,000円)、稼働23名で営業利益月158.7万円の試算実績。",
  "",
  "■ 本来のコア業務に集中できる",
  "  お客様が行うのは基本「採用活動(管理)」のみ。取引先繋ぎ・営業資料提供・契約書類一式・研修まで弊社が提供。",
  "",
  "■ 初月特典・常時サポート体制",
  "  初月に公式LINE(リッチメニュー含む)とInstagramの設計を無料納品(全顧問先様対象)。",
  "  初月は週1回(計4回)、翌月以降は月1回のZoom打合せ。LINE / チャットワークで常時相談可能。",
  "  自社メディア(社長インタビューサイト)への永久無料掲載、自社サービス(WEB制作・求人広告等)をほぼ原価で提供。",
  "",
  "■ 全国対応",
  "  神奈川県横浜市(本店) / 静岡県沼津市(支社)を拠点に全国対応。",
  "  お住まいの都道府県以外でも手広く事業展開が可能な業界特性を活かす。",
  "",
  "■ 経営理念",
  "  「ビジネスは相手を勝たせるゲームだ」を行動指針とした三方良しの経営。" +
    "  『お客様の最高のパートナーに』をミッションに長期継続のお付き合いを前提とする。",
].join("\n");

const { error } = await supabase
  .from("clients")
  .update({
    service_description,
    strengths,
  })
  .eq("id", CLIENT_ID);

if (error) throw new Error(`update failed: ${error.message}`);

console.log("✓ updated client: 運送社長支援");
console.log(`\n--- service_description (${service_description.length} chars) ---`);
console.log(service_description);
console.log(`\n--- strengths (${strengths.length} chars) ---`);
console.log(strengths);
