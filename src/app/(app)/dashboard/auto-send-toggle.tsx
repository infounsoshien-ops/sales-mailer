"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { setAutoSendForAllClients } from "../clients/actions";
import { cn } from "@/lib/utils";

/**
 * 自動送信を一括 ON/OFF するダッシュボード上のスイッチ。
 * 内部的にはログインユーザーの全顧問先 (clients.active) を一括更新する。
 */
export function AutoSendToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onToggle() {
    const next = !enabled;
    setEnabled(next); // optimistic update
    startTransition(async () => {
      const r = await setAutoSendForAllClients(next);
      if (!r.ok) {
        toast.error("切替失敗", { description: r.error });
        setEnabled(!next); // revert
        return;
      }
      toast.success(next ? "自動送信を再開しました" : "自動送信を停止しました", {
        description: `${r.count} 件の顧問先に反映`,
      });
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border bg-white px-4 py-3",
        enabled ? "border-emerald-200" : "border-amber-300 bg-amber-50"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full",
            enabled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          )}
        >
          {enabled ? <Power className="h-5 w-5" /> : <PowerOff className="h-5 w-5" />}
        </div>
        <div>
          <div className="text-sm font-semibold">
            自動送信: {enabled ? "オン" : "オフ"}
          </div>
          <div className="text-xs text-muted-foreground">
            {enabled
              ? "平日 JST 10:00〜19:00 に毎時、自動で営業メールを送信します"
              : "全顧問先の自動送信を停止中です。再開するには右のスイッチを ON に"}
          </div>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={pending}
        onClick={onToggle}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          enabled ? "bg-emerald-500" : "bg-slate-300"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform",
            enabled ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}
