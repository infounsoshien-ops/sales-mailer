import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, Building2, FileText, Users as UsersIcon } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ClientFormButton } from "./client-form-button";
import { SwitchActiveClientButton } from "./switch-active-client-button";
import type { Client } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

interface ClientWithCounts extends Client {
  contacts_count: number;
  templates_count: number;
}

export default async function ClientsPage() {
  const configured = isSupabaseConfigured();
  let clients: ClientWithCounts[] = [];
  let activeClientId: string | null = null;

  if (configured) {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (user) {
      const [{ data: clientsData }, { data: settings }] = await Promise.all([
        supabase
          .from("clients")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        supabase.from("user_settings").select("current_client_id").eq("user_id", user.id).maybeSingle()
      ]);
      activeClientId = (settings?.current_client_id as string | undefined) ?? null;

      const list = ((clientsData as Client[] | null) ?? []) as Client[];
      if (list.length > 0) {
        const ids = list.map((c) => c.id);
        const [contactsRes, templatesRes] = await Promise.all([
          supabase.from("contacts").select("client_id").in("client_id", ids),
          supabase.from("email_templates").select("client_id").in("client_id", ids)
        ]);
        const contactsByClient = new Map<string, number>();
        for (const r of ((contactsRes.data ?? []) as { client_id: string | null }[])) {
          if (r.client_id) contactsByClient.set(r.client_id, (contactsByClient.get(r.client_id) ?? 0) + 1);
        }
        const templatesByClient = new Map<string, number>();
        for (const r of ((templatesRes.data ?? []) as { client_id: string }[])) {
          templatesByClient.set(r.client_id, (templatesByClient.get(r.client_id) ?? 0) + 1);
        }
        clients = list.map((c) => ({
          ...c,
          contacts_count: contactsByClient.get(c.id) ?? 0,
          templates_count: templatesByClient.get(c.id) ?? 0
        }));
      }
    }
  }

  // 「運送社長支援」(= 自社) と、それ以外の顧問先 (= 代行案件) を分離する。
  const PRIMARY_NAME = "運送社長支援";
  const primary = clients.find((c) => c.name === PRIMARY_NAME) ?? null;
  const others = clients.filter((c) => c.name !== PRIMARY_NAME);

  const renderCard = (c: ClientWithCounts) => (
    <Card
      key={c.id}
      className={activeClientId === c.id ? "border-primary ring-2 ring-primary/20" : ""}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{c.name}</CardTitle>
            <CardDescription className="text-xs">
              {c.service_description || "(サービス未設定)"}
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {activeClientId === c.id ? (
              <Badge variant="default">使用中</Badge>
            ) : (
              <SwitchActiveClientButton clientId={c.id} />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="muted">
            <UsersIcon className="mr-1 inline h-3 w-3" />
            送信先 {c.contacts_count}
          </Badge>
          <Badge variant="muted">
            <FileText className="mr-1 inline h-3 w-3" />
            テンプレ {c.templates_count}
          </Badge>
          <Badge variant={c.from_email ? "success" : "warning"}>
            {c.from_email ? "送信元設定済" : "送信元未設定"}
          </Badge>
          {!c.active && <Badge variant="muted">無効</Badge>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/templates`}>テンプレ管理</Link>
          </Button>
          <ClientFormButton mode="edit" client={c} />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">顧問先</h1>
          <p className="text-sm text-muted-foreground">
            営業メール代行を行う顧問先(クライアント企業)を登録します。
            会社情報・送信元・テンプレートはすべて顧問先単位で管理されます。
          </p>
        </div>
        <ClientFormButton mode="create" />
      </header>

      {!configured && (
        <Card>
          <CardHeader>
            <CardTitle>Supabase 未設定</CardTitle>
            <CardDescription>
              `.env.local` 設定 + `supabase/migrations/001_initial.sql` と `002_clients_and_templates.sql` の両方を Supabase SQL Editor で実行してください。
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {clients.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white px-6 py-12 text-center">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            顧問先がまだ登録されていません。<br />
            「顧問先を追加」から最初の顧問先を登録してください。
          </p>
          <div className="mt-4">
            <ClientFormButton mode="create" />
          </div>
        </div>
      ) : (
        <>
          {primary && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                自社
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">{renderCard(primary)}</div>
            </section>
          )}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              顧問先 (代行案件)
            </h2>
            {others.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-white px-6 py-8 text-center text-sm text-muted-foreground">
                代行案件の顧問先はまだありません。
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {others.map((c) => renderCard(c))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
