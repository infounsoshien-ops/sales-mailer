import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getActiveClient } from "@/lib/active-client";
import { ContactsToolbar } from "./contacts-toolbar";
import { ContactsTable } from "./contacts-table";
import type { Contact } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams
}: {
  searchParams: { q?: string; status?: string; industry?: string };
}) {
  if (!isSupabaseConfigured()) return <NotConfigured />;

  const { active } = await getActiveClient();
  if (!active) return <NoClient />;

  const supabase = createClient();
  let q = supabase
    .from("contacts")
    .select("*")
    .eq("client_id", active.id)
    .order("created_at", { ascending: false });
  if (searchParams.status && searchParams.status !== "all") q = q.eq("status", searchParams.status);
  if (searchParams.industry) q = q.eq("industry", searchParams.industry);
  if (searchParams.q) q = q.ilike("company_name", `%${searchParams.q}%`);
  const { data } = await q;
  const contacts = ((data as Contact[] | null) ?? []) as Contact[];

  const industries = Array.from(
    new Set(contacts.map((c) => c.industry).filter(Boolean) as string[])
  ).sort();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">送信先</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{active.name}</span> の送信先 {contacts.length} 件
          </p>
        </div>
      </header>

      <ContactsToolbar
        currentQuery={searchParams.q ?? ""}
        currentStatus={searchParams.status ?? "all"}
        currentIndustry={searchParams.industry ?? ""}
        industries={industries}
        clientId={active.id}
      />

      <ContactsTable contacts={contacts} />
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
        送信先は顧問先(代行先のクライアント企業)に紐付きます。まずは顧問先を 1 つ登録してください。
      </p>
      <Button asChild>
        <Link href="/clients">顧問先を追加</Link>
      </Button>
    </div>
  );
}
