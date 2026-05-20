"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Trash2, Send } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/status-badge";
import { ContactFormDialog } from "./contact-form-dialog";
import { toggleReplied, deleteContact } from "./actions";
import type { Contact } from "@/lib/supabase/types";

export function ContactsTable({ contacts }: { contacts: Contact[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editTarget, setEditTarget] = useState<Contact | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  async function handleSendNow(c: Contact) {
    if (!confirm(`「${c.company_name}」(${c.email})に今すぐテンプレートで送信しますか?`)) return;
    setSending(c.id);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: c.id })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("送信失敗", { description: data?.error });
        return;
      }
      toast.success("送信しました", { description: c.email });
      router.refresh();
    } finally {
      setSending(null);
    }
  }

  function handleReplied(c: Contact, replied: boolean) {
    startTransition(async () => {
      const r = await toggleReplied(c.id, replied);
      if (!r.ok) toast.error("更新失敗", { description: r.error });
      else toast.success(replied ? "返信ありに更新しました" : "返信フラグを解除しました");
    });
  }

  function handleDelete(c: Contact) {
    if (!confirm(`「${c.company_name}」を削除しますか?`)) return;
    startTransition(async () => {
      const r = await deleteContact(c.id);
      if (!r.ok) toast.error("削除失敗", { description: r.error });
      else toast.success("削除しました");
    });
  }

  if (contacts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-white px-6 py-12 text-center text-sm text-muted-foreground">
        送信先がありません。CSV 取込か新規追加で登録してください。
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">会社名</TableHead>
              <TableHead className="w-[120px]">業種</TableHead>
              <TableHead className="w-[120px]">担当者</TableHead>
              <TableHead className="w-[220px]">メールアドレス</TableHead>
              <TableHead className="w-[100px]">ステータス</TableHead>
              <TableHead className="w-[80px] text-center">返信</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((c) => (
              <TableRow
                key={c.id}
                className={c.replied ? "bg-emerald-50/50 hover:bg-emerald-50" : undefined}
              >
                <TableCell className="font-medium">{c.company_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.industry || "—"}</TableCell>
                <TableCell className="text-sm">{c.person_name || "—"}</TableCell>
                <TableCell className="text-sm">{c.email}</TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
                <TableCell className="text-center">
                  <Checkbox
                    checked={c.replied}
                    disabled={pending}
                    onCheckedChange={(checked) => handleReplied(c, Boolean(checked))}
                    aria-label="返信ありフラグ"
                  />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="操作メニュー">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {c.status === "pending" && (
                        <DropdownMenuItem
                          onSelect={() => handleSendNow(c)}
                          disabled={sending === c.id}
                        >
                          <Send className="h-4 w-4" /> {sending === c.id ? "送信中…" : "今すぐ送信"}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={() => setEditTarget(c)}>
                        <Pencil className="h-4 w-4" /> 編集
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => handleDelete(c)}
                      >
                        <Trash2 className="h-4 w-4" /> 削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ContactFormDialog
        open={Boolean(editTarget)}
        onOpenChange={(o) => !o && setEditTarget(null)}
        contact={editTarget}
      />
    </>
  );
}
