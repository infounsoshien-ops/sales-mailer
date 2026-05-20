# 営業メール送信ツール (keikamotsu-sales-mailer)

**営業メール代行業者向け**の自動送信 Web アプリ。複数の顧問先(クライアント企業)の代理で営業メールをそれぞれの会社名・送信元・テンプレートで自動配信します。

## 主要な機能

- **マルチテナント**: 1 ログインで N 個の顧問先(クライアント)を管理。顧問先ごとに送信元・署名・テンプレ・送信先を分離
- **テンプレ無作為選択**: 顧問先ごとに 3〜5 個のテンプレを登録すると、送信時にランダムで 1 つ選ばれてスパム判定を回避
- **プレースホルダ差し込み**: `{{会社名}}`, `{{担当者名}}`, `{{業種}}`, `{{自社名}}` を本文と件名に自動置換
- **AI ハイブリッド (任意・完全無料)**: テンプレに `{{ai_subject_hint}}` / `{{ai_opening}}` を入れると、Google Gemini が件名ヒントと書き出し1-2文だけを相手企業向けに生成して差し込み。テンプレ全体は固定なのでブレなし、API キーは AI Studio で無料発行 (クレカ不要、1日 1500 リクエストまで無料)
- **CSV 一括取込**: UTF-8 / Shift-JIS 自動判別、重複チェック、エラー行番号表示
- **自動送信**: Vercel Cron で平日 10:00 から毎時 1 件ペース、上限 10 件/日
- **法令準拠**: すべての送信メールに署名 + ワンクリック配信停止リンクを自動付与(特定電子メール法対応)
- **開封トラッキング**: Resend Webhook 経由で開封・バウンス情報を反映
- **手動送信**: 送信先一覧から個別に「今すぐ送信」も可

## 技術スタック

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Auth)
- Resend (メール送信)
- Vercel Cron Jobs (自動実行)

> 注: Anthropic Claude API による「AI 個別生成」機能は初版で実装したものの、テンプレ運用に切替えました。
> `src/lib/anthropic.ts` と `src/lib/prompts.ts` はライブラリとして残置してあるので、将来 AI 併用したくなった時に復活させられます。
>
> その上で **Google Gemini (無料枠) を使ったハイブリッド機能を追加** しました。テンプレ全体は固定のまま、相手企業に応じた件名ヒントと書き出し1-2文だけを AI が差し込む方式。詳細は下記「AI ハイブリッド機能」セクション参照。

## ローカル開発

### 1. 依存インストール

```powershell
cd sales-mailer
npm install
```

> PowerShell の実行ポリシーで `npm.ps1` が無効化されている場合は `npm.cmd install` を使ってください。

### 2. 環境変数

`.env.local.example` を `.env.local` にコピーして埋めます。

| 変数 | 取得元 | 必須? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | 必須 |
| `SUPABASE_SERVICE_ROLE_KEY` | 同上(秘匿) | Webhook / Cron で必須 |
| `RESEND_API_KEY` | <https://resend.com/api-keys> | 必須 |
| `RESEND_WEBHOOK_SECRET` | Resend → Webhooks 作成時に発行 | 開封トラッキングに必要 |
| `CRON_SECRET` | 32 文字以上のランダム文字列 | Cron 認証 + 配信停止 HMAC |
| `NEXT_PUBLIC_APP_URL` | デプロイ後の URL | 配信停止リンクのベース |
| `ANTHROPIC_API_KEY` | <https://console.anthropic.com/> | テンプレ運用なら **不要** |
| `GEMINI_API_KEY` | <https://aistudio.google.com/> (Google アカウントで無料発行・クレカ不要) | AI ハイブリッド使うなら必須・テンプレのみなら不要 |

### 3. Supabase スキーマ

Supabase SQL Editor で **以下の順に** 実行してください:

1. `supabase/migrations/001_initial.sql` — 基本テーブル + RLS
2. `supabase/migrations/002_clients_and_templates.sql` — 顧問先 + テンプレートテーブル

### 4. Resend ドメイン設定(顧問先ごと)

代行する顧問先のドメインで送信するには、**各顧問先のドメインを Resend に登録** する必要があります:

1. Resend Dashboard → Domains → Add Domain で顧問先のドメインを追加
2. 表示される DNS レコード(SPF, DKIM, MX 等)を **顧問先側の DNS に追加してもらう**(顧問先の IT 担当者などに依頼)
3. 認証完了後、本アプリの「顧問先」画面で送信元メールアドレスを設定

> Resend Free プランは 1 ドメイン + 100 通/日 です。複数顧問先で運用するには Pro プラン($20/月)が必要になる可能性があります。

### 5. 開発サーバー起動

```powershell
npm run dev
```

<http://localhost:3000> でアクセス → サインアップ → 顧問先を追加 → テンプレを登録 → 送信先 CSV 取込 → 送信。

## デプロイ手順 (Vercel)

1. GitHub に push
2. Vercel で `Import Project` → リポジトリ選択
3. **Root Directory** を `sales-mailer` に設定
4. 環境変数を Vercel に登録
5. デプロイ
6. `NEXT_PUBLIC_APP_URL` を本番 URL で上書き → 再デプロイ
7. Resend Webhook URL に `https://{本番URL}/api/webhooks/resend` を登録、発行されたシークレットを `RESEND_WEBHOOK_SECRET` に追加

### Cron 設定

`vercel.json` に毎時実行の Cron が定義済み(`/api/cron/send-emails`)。
**Vercel Hobby は 1 日 1 回までの制限あり**。毎時 Cron には Pro プランが必要。

代替: GitHub Actions の scheduled workflow から `curl -H "Authorization: Bearer $CRON_SECRET" $URL/api/cron/send-emails` を毎時叩く構成にすれば Hobby プランでも運用可。

## 運用フロー

```
[初回]
 1. 顧問先 A を登録(会社名・署名・送信元 etc.)
 2. 顧問先 A のテンプレを 3〜5 個登録
 3. 顧問先 A の送信先 CSV を取込
 ↓
[日次・自動]
 - 毎時 Cron が走り、各顧問先の設定に従って 1 件ずつ送信
 - 平日 10:00〜19:00 で 10 件/日(設定変更可)
 ↓
[週次・手動]
 - 送信履歴をチェック、返信があった相手にチェックを入れる
 - 新規顧問先を追加するときは 1〜3 を繰り返す
```

## アーキテクチャ

```
auth.users (Supabase Auth)
   │ (1:N) user_id
   ▼
clients (顧問先 — 会社情報・送信元・送信時刻)
   │ (1:N) client_id
   ├─► contacts (顧問先 A 向けの送信先)
   ├─► email_templates (顧問先 A のテンプレ 3〜5 個)
   └─► email_logs (送信履歴、contacts 経由)

ユーザーは「アクティブな顧問先」を切替えながら作業する。
切替状態は user_settings.current_client_id に保存。
```

## ファイル構成

```
sales-mailer/
├─ src/
│  ├─ app/
│  │  ├─ (app)/               # 認証必須エリア (AppShell でラップ)
│  │  │  ├─ dashboard/page.tsx
│  │  │  ├─ clients/          # 顧問先 CRUD
│  │  │  ├─ templates/        # テンプレ CRUD(アクティブ顧問先)
│  │  │  ├─ contacts/         # 送信先 CRUD(アクティブ顧問先)
│  │  │  └─ logs/page.tsx     # 送信履歴(アクティブ顧問先)
│  │  ├─ (auth)/              # ログイン・サインアップ
│  │  ├─ api/
│  │  │  ├─ cron/send-emails/ # 毎時実行、各顧問先 1 件ずつ送信
│  │  │  ├─ send-email/       # 手動送信
│  │  │  └─ webhooks/resend/  # 開封・バウンス受信
│  │  └─ unsubscribe/         # 配信停止ワンクリック処理
│  ├─ components/
│  │  ├─ app-shell.tsx         # サイドバー + 顧問先切替
│  │  ├─ client-switcher.tsx
│  │  └─ ui/                   # shadcn/ui コンポーネント
│  └─ lib/
│     ├─ supabase/
│     ├─ active-client.ts      # 現在の顧問先を取得
│     ├─ template-render.ts    # プレースホルダ差し込み
│     ├─ send-flow.ts          # 送信フロー(手動 + Cron 共通)
│     ├─ email-format.ts       # 署名 + 配信停止リンク付与
│     ├─ resend.ts
│     ├─ unsubscribe.ts        # HMAC URL 生成
│     ├─ webhook-verify.ts
│     ├─ csv.ts
│     ├─ time-jst.ts
│     ├─ anthropic.ts           # ※ 残置(現状未使用)
│     ├─ prompts.ts             # ※ 残置(現状未使用)
│     └─ utils.ts
├─ supabase/migrations/
│  ├─ 001_initial.sql
│  └─ 002_clients_and_templates.sql
├─ vercel.json
└─ sample-contacts.csv
```

## AI ハイブリッド機能 (Gemini)

完全無料で「テンプレに少しだけ AI 個別感を足す」運用ができます。テンプレ全体を AI が書くわけではないので、ブレなし・コスト最小・既存テンプレ運用を壊しません。

### 仕組み

テンプレに以下 2 種類のプレースホルダを入れると、送信時に Gemini が中身を生成して差し込みます:

| プレースホルダ | 生成される内容 | 文字数目安 |
|---|---|---|
| `{{ai_subject_hint}}` | 件名に差し込む短いフレーズ (相手会社の業界に絡めた一言) | 10〜20 文字 |
| `{{ai_opening}}` | 本文の書き出し 1〜2 文 (相手会社の業界に絡めた挨拶) | 50〜150 文字 |

プレースホルダが**入っているテンプレでだけ** Gemini が呼ばれます。テンプレに入れなければ無料 API 呼び出しも発生しません (= opt-in 方式)。

### セットアップ (1 分で完了)

1. <https://aistudio.google.com/> に Google アカウントでログイン
2. 左メニュー「Get API key」→「Create API key」をクリック
3. 表示されたキー (`AIza...`) をコピー
4. `.env.local` の `GEMINI_API_KEY=` に貼り付け
5. (本番デプロイ済みなら) Vercel の Environment Variables にも同じキーを追加

**クレカ登録不要、無料枠 1 日 1500 リクエスト**。1 通あたり 1 リクエストなので、日 100 通送っても余裕の範囲。

### サンプルテンプレ

「テンプレ」画面で新規テンプレを作って、件名と本文を以下の例のように書く:

**件名:**
```
{{ai_subject_hint}}に関するご提案 — {{自社名}}より
```

**本文:**
```
{{担当者名}} 様

突然のご連絡失礼いたします。{{自社名}}の田中です。

{{ai_opening}}

弊社では中小企業の物流コスト削減を支援するサービスを提供しております。
特に EC・通販事業者様からは「配送コストが 30% 削減できた」とのお声を多数いただいております。

もしご興味ありましたら、5 分ほどお時間いただいて簡単なご紹介をさせていただけませんでしょうか。
ご返信お待ちしております。
```

これで送信されるメールは例えばこうなる:

```
件名: 貴社の EC 事業に関するご提案 — 株式会社サンプル軽貨物より

山田太郎 様

突然のご連絡失礼いたします。株式会社サンプル軽貨物の田中です。

貴社の Web サイトを拝見し、特に EC モール出店事業の伸びが印象的でした。
ラストワンマイル配送でお力になれる部分があるかもしれないと感じご連絡しました。

弊社では中小企業の物流コスト削減を支援するサービスを提供しております。
...
```

会社ごとに「貴社の EC 事業」「貴社の SaaS プロダクト」「貴社の人材紹介事業」など、相手会社の業界に応じた表現になります。

### Gemini 呼び出しで失敗したらどうなる?

API エラーや無料枠超過などで Gemini が失敗した場合、警告ログを残してプレースホルダは空文字に置換され、テンプレのみで送信されます。**送信自体は止まりません**。

### コスト

- Gemini API: 無料枠内で運用すれば **¥0/月**
- Resend: 1日 100 通までは無料枠 (それ以上は要 Pro プラン $20/月)
- Vercel: Hobby プランで運用可

合計 **完全無料** で運用可能 (1日 100 通以内、AI 呼び出し 1500 回以内)。

## 配信停止リンク

メール末尾に HMAC 署名付き URL が自動付与されます:

```
${NEXT_PUBLIC_APP_URL}/unsubscribe?c=<contact_id>&t=<HMAC_token>
```

クリックされた送信先は自動で `status='unsubscribed'` に。HMAC のシークレットは `CRON_SECRET` を兼用。

## 特定電子メール法の準拠

- 各送信メールに署名(会社名・住所・電話) ← 顧問先設定で入力した値が自動付与
- 各送信メールに配信停止リンク ← 自動付与、ワンクリック対応
- Resend の `email.complained`(スパム報告)も自動で配信停止扱い

## つまずきポイント

| 症状 | 対処 |
|---|---|
| 「Supabase 未設定」と表示される | `.env.local` を正しい値に。`xxxx` プレースホルダが残っていないか確認 |
| 「顧問先を選択してください」 | `/clients` で顧問先を登録、サイドバーで切替 |
| 「テンプレートが未登録」 | `/templates` で 1 つ以上アクティブなテンプレを作る |
| メール送信が 401 で失敗 | Resend API キー + ドメイン認証(各顧問先のドメイン)を確認 |
| Cron 401 | Vercel 環境変数の `CRON_SECRET` が正しく設定されているか |
| 配信停止リンクが効かない | `NEXT_PUBLIC_APP_URL` が本番 URL になっているか、`CRON_SECRET` がデプロイ後変更されていないか |
