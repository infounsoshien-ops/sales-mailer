import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Inbox, Send, MailCheck, Reply, Building2, FileText } from "lucide-react";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getActiveClient } from "@/lib/active-client";
import { nowInJst } from "@/lib/time-jst";
import { AutoSendToggle } from "./auto-send-toggle";

export const dynamic = "force-dynamic";

const MONTHLY_TARGET = 300;

interface Stats {
  monthlySent: number;
  todaySent: number;
  todayPlanned: number;
  repliedCount: number;
  pendingCount: number;
  fromEmailSet: boolean;
  templatesCount: number;
}

async function fetchStats(clientId: string, dailyLimit: number, fromEmail: string | null): Promise<Stats> {
  const supabase = createClient();
  const jst = nowInJst();
  const monthStartJst = jst.date.slice(0, 8) + "01";
  const monthStartUtc = new Date(`${monthStartJst}T00:00:00+09:00`).toISOString();
  const todayStartUtc = jst.utcMidnightOfJstDay.toISOString();

  const [monthlySentRes, todaySentRes, contactsRes, templatesRes] = await Promise.all([
    supabase
      .from("email_logs")
      .select("id, contact:contacts!inner(client_id)", { count: "exact", head: true })
      .eq("contact.client_id", clientId)
      .is("error_message", null)
      .gte("sent_at", monthStartUtc),
    supabase
      .from("email_logs")
      .select("id, contact:contacts!inner(client_id)", { count: "exact", head: true })
      .eq("contact.client_id", clientId)
      .is("error_message", null)
      .gte("sent_at", todayStartUtc),
    supabase.from("contacts").select("status, replied").eq("client_id", clientId),
    supabase
      .from("email_templates")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("active", true)
  ]);

  const contacts = (contactsRes.data ?? []) as { status: string; replied: boolean }[];

  return {
    monthlySent: monthlySentRes.count ?? 0,
    todaySent: todaySentRes.count ?? 0,
    todayPlanned: dailyLimit,
    repliedCount: contacts.filter((c) => c.replied).length,
    pendingCount: contacts.filter((c) => c.status === "pending").length,
    fromEmailSet: Boolean(fromEmail),
    templatesCount: templatesRes.count ?? 0
  };
}

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) return <NotConfigured />;

  const { active, clients } = await getActiveClient();
  if (!active) return <NoClient hasClients={clients.length > 0} />;

  const stats = await fetchStats(active.id, active.daily_limit, active.from_email);
  const progress = Math.min(100, Math.round((stats.monthlySent / MONTHLY_TARGET) * 100));

  // 「自動送信」ON/OFF の初期状態 = ログインユーザーの全顧問先が active なら ON
  const autoSendEnabled =
    clients.length > 0 && clients.every((c) => c.active);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">{active.name}</span> の送信状況(月 {MONTHLY_TARGET} 件目安)
        </p>
      </header>

      <AutoSendToggle initialEnabled={autoSendEnabled} />

      {!stats.fromEmailSet && (
        <Card className="border-blue-300 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">送信元メールアドレス未設定</CardTitle>
            <CardDescription className="text-blue-800">
              自動送信を有効にするには、顧問先設定で送信元メールアドレス(Resend 認証済みドメイン)を設定してください。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/clients">顧問先を編集</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {stats.templatesCount === 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">テンプレートが未登録です</CardTitle>
            <CardDescription className="text-amber-800">
              送信にはテンプレートが 1 つ以上必要です。3〜5 個登録するとローテーションされます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/templates">テンプレートを作成</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>今月の進捗</CardTitle>
          <CardDescription>
            {stats.monthlySent} / {MONTHLY_TARGET} 件({progress}%)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progress} />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="今日の予定"
          value={`${stats.todaySent} / ${stats.todayPlanned}`}
          icon={<Send className="h-4 w-4" />}
        />
        <StatCard label="今日の送信済" value={stats.todaySent} icon={<MailCheck className="h-4 w-4" />} />
        <StatCard label="返信あり" value={stats.repliedCount} icon={<Reply className="h-4 w-4" />} highlight />
        <StatCard label="未送信" value={stats.pendingCount} icon={<Inbox className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>クイックアクション</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/contacts">
              <Inbox className="h-4 w-4" /> 送信先の管理
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/templates">
              <FileText className="h-4 w-4" /> テンプレ編集
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/logs">送信履歴</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/clients">
              <Building2 className="h-4 w-4" /> 顧問先設定
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  highlight
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  const numericValue = typeof value === "number" ? value : null;
  const highlightActive = highlight && numericValue !== null && numericValue > 0;
  return (
    <Card className={highlightActive ? "border-emerald-500 ring-2 ring-emerald-200" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${highlightActive ? "text-emerald-600" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function NotConfigured() {
  return (
    <div className="mx-auto max-w-3xl">
      <Card className="border-amber-300 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-amber-900">Supabase 未設定</CardTitle>
          <CardDescription className="text-amber-800">
            `.env.local` に Supabase 接続情報を設定し、`supabase/migrations/` の 2 つの SQL を順に実行してください。
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function NoClient({ hasClients }: { hasClients: boolean }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4 text-center">
      <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold">
        {hasClients ? "顧問先を選択してください" : "顧問先を登録しましょう"}
      </h1>
      <p className="text-sm text-muted-foreground">
        営業メールは顧問先単位で管理します。まずは代行先の企業を 1 つ登録してください。
      </p>
      <Button asChild>
        <Link href="/clients">顧問先の管理</Link>
      </Button>
    </div>
  );
}
