"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { switchActiveClient } from "@/app/(app)/clients/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/supabase/types";

/**
 * 左メニュー用の「顧問先ショートカット一覧」。
 * クリックすると active client を切り替えて /contacts (送信先) 画面に遷移する。
 */
export function ClientNavList({
  clients,
  activeId,
}: {
  clients: Pick<Client, "id" | "name">[];
  activeId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (clients.length === 0) return null;

  function go(id: string) {
    if (id === activeId) {
      router.push("/contacts");
      return;
    }
    startTransition(async () => {
      const r = await switchActiveClient(id);
      if (!r.ok) {
        toast.error("切替失敗", { description: r.error });
        return;
      }
      router.push("/contacts");
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <div className="px-3 pb-1 pt-2 text-xs uppercase tracking-wider text-muted-foreground">
        顧問先
      </div>
      {clients.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => go(c.id)}
          disabled={pending}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
            "hover:bg-slate-100 disabled:opacity-60",
            c.id === activeId
              ? "bg-slate-100 font-medium text-primary"
              : "text-slate-700"
          )}
        >
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="truncate text-left">{c.name}</span>
          {c.id === activeId && (
            <span className="ml-auto text-xs text-primary">●</span>
          )}
        </button>
      ))}
    </div>
  );
}
