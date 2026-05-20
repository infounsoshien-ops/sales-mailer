import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getActiveClient } from "@/lib/active-client";
import { formatDateJa } from "@/lib/utils";
import type { EmailLog, Contact } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

interface LogRow extends EmailLog {
  contact: Pick<Contact, "company_name" | "email" | "status"> | null;
}

export default async function LogsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Supabase 未設定</CardTitle>
          <CardDescription>`.env.local` 設定後に送信履歴が表示されます。</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { active } = await getActiveClient();
  let logs: LogRow[] = [];
  if (active) {
    const supabase = createClient();
    const { data } = await supabase
      .from("email_logs")
      .select("*, contact:contacts!inner(company_name, email, status, client_id)")
      .eq("contact.client_id", active.id)
      .order("sent_at", { ascending: false })
      .limit(200);
    logs = ((data ?? []) as unknown as LogRow[]).map((r) => ({
      ...r,
      contact: r.contact
        ? { company_name: r.contact.company_name, email: r.contact.email, status: r.contact.status }
        : null
    }));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">送信履歴</h1>
        <p className="text-sm text-muted-foreground">
          {active ? (
            <>
              <span className="font-medium">{active.name}</span> の送信履歴(最新 200 件)。
              開封・バウンス情報は Resend Webhook で更新されます
            </>
          ) : (
            "顧問先を選択してください"
          )}
        </p>
      </header>

      {logs.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white px-6 py-12 text-center text-sm text-muted-foreground">
          送信履歴がまだありません。
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">送信日時</TableHead>
                <TableHead className="w-[200px]">送信先</TableHead>
                <TableHead>件名</TableHead>
                <TableHead className="w-[120px]">開封</TableHead>
                <TableHead className="w-[120px]">結果</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs text-muted-foreground">{formatDateJa(l.sent_at)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{l.contact?.company_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{l.contact?.email ?? ""}</div>
                  </TableCell>
                  <TableCell className="text-sm">{l.subject ?? "—"}</TableCell>
                  <TableCell>
                    {l.opened_at ? (
                      <Badge variant="success">開封済</Badge>
                    ) : (
                      <Badge variant="muted">未開封</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {l.error_message ? (
                      <Badge variant="destructive">{l.bounced ? "バウンス" : "エラー"}</Badge>
                    ) : (
                      <Badge variant="default">送信</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
