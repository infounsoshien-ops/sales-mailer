import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getActiveClient } from "@/lib/active-client";
import { TemplateFormButton } from "./template-form-button";
import { ToggleTemplateActiveButton } from "./toggle-active-button";
import type { EmailTemplate } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  if (!isSupabaseConfigured()) return <NotConfigured />;

  const { active } = await getActiveClient();
  if (!active) return <NoClient />;

  const supabase = createClient();
  const { data: templatesData } = await supabase
    .from("email_templates")
    .select("*")
    .eq("client_id", active.id)
    .order("created_at", { ascending: true });
  const templates = ((templatesData as EmailTemplate[] | null) ?? []) as EmailTemplate[];
  const activeCount = templates.filter((t) => t.active).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">テンプレート</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{active.name}</span> の営業メール文面。
            送信時に有効なテンプレートから無作為に1つ選ばれ、{"{{会社名}}"} 等のプレースホルダが差し込まれます。
          </p>
        </div>
        <TemplateFormButton mode="create" clientId={active.id} />
      </header>

      <Card className="bg-slate-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">使えるプレースホルダ</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <PlaceholderTip code={"{{会社名}}"} desc="送信先の会社名(例: 株式会社サンプル)" />
          <PlaceholderTip code={"{{担当者名}}"} desc="送信先の担当者(空なら『ご担当者様』)" />
          <PlaceholderTip code={"{{業種}}"} desc="送信先の業種(空欄なら省略)" />
          <PlaceholderTip code={"{{自社名}}"} desc={`現在の顧問先(${active.name})の名前`} />
        </CardContent>
      </Card>

      {templates.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white px-6 py-12 text-center text-sm text-muted-foreground">
          テンプレートがありません。
          <div className="mt-3 text-xs">
            3〜5 個のテンプレートを登録すると、送信時に無作為に選ばれて自然なバリエーションが生まれます。
          </div>
          <div className="mt-4">
            <TemplateFormButton mode="create" clientId={active.id} />
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <Badge variant="success">有効 {activeCount}</Badge>
            <Badge variant="muted">無効 {templates.length - activeCount}</Badge>
          </div>
          <div className="space-y-3">
            {templates.map((t) => (
              <Card key={t.id} className={!t.active ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{t.name}</CardTitle>
                      <CardDescription className="text-sm">件名: {t.subject}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <ToggleTemplateActiveButton id={t.id} currentActive={t.active} />
                      <TemplateFormButton mode="edit" template={t} clientId={active.id} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md border bg-slate-50 p-3 font-sans text-xs">
                    {t.body}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PlaceholderTip({ code, desc }: { code: string; desc: string }) {
  return (
    <div className="flex flex-col">
      <code className="text-xs font-mono">{code}</code>
      <span className="text-xs text-muted-foreground">{desc}</span>
    </div>
  );
}

function NotConfigured() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Supabase 未設定</CardTitle>
        <CardDescription>`.env.local` 設定とマイグレーション実行後にご利用ください。</CardDescription>
      </CardHeader>
    </Card>
  );
}

function NoClient() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 text-center">
      <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold">先に顧問先を登録してください</h1>
      <p className="text-sm text-muted-foreground">
        テンプレートは顧問先ごとに管理します。まずは顧問先(代行先のクライアント企業)を 1 つ登録してください。
      </p>
      <Button asChild>
        <Link href="/clients">顧問先を追加</Link>
      </Button>
    </div>
  );
}
