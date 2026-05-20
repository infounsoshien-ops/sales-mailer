"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Mail,
  FileText,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/clients", label: "顧問先", icon: Building2 },
  { href: "/templates", label: "テンプレート", icon: FileText },
  { href: "/contacts", label: "送信先", icon: Users },
  { href: "/logs", label: "送信履歴", icon: Mail },
];

/**
 * 左メニューのナビゲーション。現在のページを青くハイライトする。
 */
export function SidebarNav() {
  const pathname = usePathname() ?? "";
  return (
    <>
      {navItems.map(({ href, label, icon: Icon }) => {
        // /clients/123 のようなサブパスも親メニューを active にする
        const isActive = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            prefetch={true}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-primary/10 font-medium text-primary"
                : "text-slate-700 hover:bg-slate-100"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </>
  );
}
