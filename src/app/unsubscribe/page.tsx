import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyContactToken } from "@/lib/unsubscribe";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  searchParams
}: {
  searchParams: { c?: string; t?: string };
}) {
  const contactId = searchParams.c;
  const token = searchParams.t;

  if (!contactId || !token) {
    return <Layout><Notice title="リンクが不正です" description="必要なパラメータが含まれていません。" /></Layout>;
  }

  if (!verifyContactToken(contactId, token)) {
    return <Layout><Notice title="リンクが不正です" description="このリンクは検証に失敗しました。" /></Layout>;
  }

  if (!isSupabaseConfigured()) {
    return (
      <Layout>
        <Notice
          title="サーバー設定が未完了です"
          description="管理者にこの URL を共有してください。設定完了後に再度お試しください。"
        />
      </Layout>
    );
  }

  const supabase = createAdminClient();
  const { data: contact, error } = await supabase
    .from("contacts")
    .select("id, company_name, email, status")
    .eq("id", contactId)
    .maybeSingle();

  if (error || !contact) {
    return <Layout><Notice title="対象が見つかりませんでした" /></Layout>;
  }

  if (contact.status !== "unsubscribed") {
    await supabase
      .from("contacts")
      .update({ status: "unsubscribed" })
      .eq("id", contact.id);
  }

  return (
    <Layout>
      <Notice
        title="配信停止が完了しました"
        description={`${contact.email} 宛の今後のメールは送信されません。お手数をおかけしました。`}
      />
    </Layout>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

function Notice({ title, description }: { title: string; description?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        この画面を閉じていただいて構いません。
      </CardContent>
    </Card>
  );
}
