"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { createClientRecord, updateClientRecord, deleteClientRecord } from "./actions";
import { AttachmentSection } from "./attachment-section";
import type { Client } from "@/lib/supabase/types";

export function ClientFormButton({
  mode,
  client
}: {
  mode: "create" | "edit";
  client?: Client;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const initial = {
    name: client?.name ?? "",
    service_description: client?.service_description ?? "EC・ネット通販向けラストワンマイル配送",
    strengths: client?.strengths ?? "",
    signature: client?.signature ?? "",
    from_email: client?.from_email ?? "",
    daily_limit: client?.daily_limit ?? 10,
    send_time: client?.send_time ?? "10:00",
    skip_weekends: client?.skip_weekends ?? true,
    active: client?.active ?? true
  };
  const [form, setForm] = useState(initial);

  function reset() {
    setForm(initial);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r =
        mode === "create"
          ? await createClientRecord(form)
          : await updateClientRecord(client!.id, form);
      if (!r.ok) {
        toast.error(mode === "create" ? "追加失敗" : "更新失敗", { description: r.error });
        return;
      }
      toast.success(mode === "create" ? "顧問先を追加しました" : "更新しました");
      setOpen(false);
      router.refresh();
    });
  }

  function onDelete() {
    if (!client) return;
    if (!confirm(`「${client.name}」を削除すると、関連する送信先・テンプレート・送信履歴も全て削除されます。よろしいですか?`))
      return;
    startTransition(async () => {
      const r = await deleteClientRecord(client.id);
      if (!r.ok) {
        toast.error("削除失敗", { description: r.error });
        return;
      }
      toast.success("削除しました");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        size={mode === "create" ? "default" : "sm"}
        variant={mode === "create" ? "default" : "outline"}
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        {mode === "create" ? (
          <>
            <Plus className="h-4 w-4" /> 顧問先を追加
          </>
        ) : (
          <>
            <Pencil className="h-4 w-4" /> 編集
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "顧問先を追加" : "顧問先を編集"}</DialogTitle>
            <DialogDescription>
              この顧問先のフリで送る営業メールの送信元・署名・送信時刻を設定します
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cl-name">顧問先名 *</Label>
              <Input
                id="cl-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="株式会社サンプル軽貨物"
              />
            </div>

            <div>
              <Label htmlFor="cl-service">サービス内容</Label>
              <Input
                id="cl-service"
                value={form.service_description}
                onChange={(e) => setForm({ ...form, service_description: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="cl-strengths">自社の強み</Label>
              <Textarea
                id="cl-strengths"
                rows={3}
                value={form.strengths}
                onChange={(e) => setForm({ ...form, strengths: e.target.value })}
                placeholder="即日配送に対応 / 東京23区内30分以内集荷 / 単価280円〜"
              />
            </div>

            <div>
              <Label htmlFor="cl-signature">署名(特定電子メール法準拠の住所・連絡先必須)</Label>
              <Textarea
                id="cl-signature"
                rows={5}
                value={form.signature}
                onChange={(e) => setForm({ ...form, signature: e.target.value })}
                placeholder={"━━━━━━━━━━\n株式会社サンプル軽貨物\n営業担当 山田\n〒100-0001 東京都千代田区千代田1-1-1\nTEL: 03-0000-0000\n━━━━━━━━━━"}
              />
            </div>

            <div>
              <Label htmlFor="cl-from">送信元メールアドレス(Resend で認証済みのドメイン)</Label>
              <Input
                id="cl-from"
                type="email"
                value={form.from_email}
                onChange={(e) => setForm({ ...form, from_email: e.target.value })}
                placeholder="sales@client-domain.co.jp"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cl-limit">1日の送信上限</Label>
                <Input
                  id="cl-limit"
                  type="number"
                  min={1}
                  max={100}
                  value={form.daily_limit}
                  onChange={(e) => setForm({ ...form, daily_limit: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="cl-time">送信時刻(JST)</Label>
                <Input
                  id="cl-time"
                  type="time"
                  value={form.send_time}
                  onChange={(e) => setForm({ ...form, send_time: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-md border p-3">
              <Checkbox
                id="cl-weekends"
                checked={form.skip_weekends}
                onCheckedChange={(c) => setForm({ ...form, skip_weekends: Boolean(c) })}
              />
              <Label htmlFor="cl-weekends">土日は送信をスキップ</Label>
            </div>

            {mode === "edit" && client && <AttachmentSection clientId={client.id} />}

            {mode === "edit" && (
              <div className="flex items-center gap-2 rounded-md border p-3">
                <Checkbox
                  id="cl-active"
                  checked={form.active}
                  onCheckedChange={(c) => setForm({ ...form, active: Boolean(c) })}
                />
                <div>
                  <Label htmlFor="cl-active">この顧問先を有効にする</Label>
                  <p className="text-xs text-muted-foreground">
                    無効にすると Cron 自動送信の対象外になります(過去履歴は残ります)
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
              {mode === "edit" && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={onDelete}
                  disabled={pending}
                >
                  <Trash2 className="h-4 w-4" /> 削除
                </Button>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "保存中…" : mode === "create" ? "追加" : "更新"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
