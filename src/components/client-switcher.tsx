"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { switchActiveClient } from "@/app/(app)/clients/actions";
import { toast } from "sonner";
import type { Client } from "@/lib/supabase/types";

export function ClientSwitcher({
  clients,
  activeId
}: {
  clients: Pick<Client, "id" | "name">[];
  activeId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const active = clients.find((c) => c.id === activeId) ?? null;

  function onSelect(id: string) {
    if (id === activeId) return;
    startTransition(async () => {
      const r = await switchActiveClient(id);
      if (!r.ok) {
        toast.error("切替失敗", { description: r.error });
        return;
      }
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-2 rounded-md border bg-white px-3 py-2 text-left text-sm hover:bg-slate-50"
        disabled={pending}
      >
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">顧問先</div>
          <div className="truncate font-medium">
            {pending ? "切替中…" : active?.name ?? "(未選択)"}
          </div>
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {clients.length === 0 ? (
          <DropdownMenuItem disabled>顧問先がありません</DropdownMenuItem>
        ) : (
          clients.map((c) => (
            <DropdownMenuItem key={c.id} onSelect={() => onSelect(c.id)}>
              <div className="flex w-full items-center justify-between">
                <span>{c.name}</span>
                {c.id === activeId && <span className="text-xs text-primary">●</span>}
              </div>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/clients" className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> 顧問先の管理・追加
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
