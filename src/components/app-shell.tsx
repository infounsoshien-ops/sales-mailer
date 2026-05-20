import Link from "next/link";
import { LayoutDashboard, Users, Mail, FileText, Send, Building2 } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { ClientSwitcher } from "./client-switcher";
import { ClientNavList } from "./client-nav-list";
import type { Client } from "@/lib/supabase/types";

const navItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/clients", label: "顧問先", icon: Building2 },
  { href: "/templates", label: "テンプレート", icon: FileText },
  { href: "/contacts", label: "送信先", icon: Users },
  { href: "/logs", label: "送信履歴", icon: Mail }
];

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
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          {clients.length > 0 && (
            <>
              <div className="my-2 border-t" />
              <ClientNavList clients={clients} activeId={activeClientId} />
            </>
          )}
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
