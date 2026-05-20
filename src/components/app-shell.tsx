import Link from "next/link";
import { Send } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { ClientSwitcher } from "./client-switcher";
import { ClientNavList } from "./client-nav-list";
import { SidebarNav } from "./sidebar-nav";
import type { Client } from "@/lib/supabase/types";

export async function AppShell({ children }: { children: React.ReactNode }) {
  let userEmail: string | null = null;
  let clients: Pick<Client, "id" | "name">[] = [];
  let activeClientId: string | null = null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      userEmail = userData.user?.email ?? null;
      if (userData.user) {
        const [{ data: clientsData }, { data: settings }] = await Promise.all([
          supabase
            .from("clients")
            .select("id, name")
            .eq("user_id", userData.user.id)
            .order("created_at", { ascending: true }),
          supabase
            .from("user_settings")
            .select("current_client_id")
            .eq("user_id", userData.user.id)
            .maybeSingle()
        ]);
        clients = ((clientsData as { id: string; name: string }[] | null) ?? []) as Client[];
        activeClientId = (settings?.current_client_id as string | undefined) ?? null;
      }
    } catch {
      // Supabase 未設定時もレイアウトは描画
    }
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r bg-white md:flex md:flex-col">
        <Link href="/dashboard" className="flex items-center gap-2 border-b px-5 py-4">
          <Send className="h-5 w-5 text-primary" />
          <span className="font-bold">営業メーラー</span>
        </Link>
        <div className="border-b px-3 py-3">
          <ClientSwitcher clients={clients} activeId={activeClientId} />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          <SidebarNav />
          {(() => {
            // 「運送社長支援」(自社) は他の顧問先 (代行案件) と区別して、
            // 送信履歴の直下に独立したショートカットとして表示する。
            const PRIMARY_NAME = "運送社長支援";
            const primary = clients.find((c) => c.name === PRIMARY_NAME);
            const others = clients.filter((c) => c.name !== PRIMARY_NAME);
            return (
              <>
                {primary && (
                  <>
                    <div className="my-2 border-t" />
                    <ClientNavList
                      clients={[primary]}
                      activeId={activeClientId}
                    />
                  </>
                )}
                {others.length > 0 && (
                  <>
                    <div className="my-2 border-t" />
                    <ClientNavList
                      clients={others}
                      activeId={activeClientId}
                      label="顧問先"
                    />
                  </>
                )}
              </>
            );
          })()}
        </nav>
        <div className="border-t px-3 py-3">
          {userEmail && (
            <div className="px-3 pb-2 text-xs text-muted-foreground" title={userEmail}>
              <div className="truncate">{userEmail}</div>
            </div>
          )}
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
