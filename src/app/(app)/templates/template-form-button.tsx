"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { createTemplate, updateTemplate, deleteTemplate } from "./actions";
import type { EmailTemplate } from "@/lib/supabase/types";

const DEFAULT_BODY = `{{会社名}} {{担当者名}} 様

突然のご連絡失礼いたします。
{{自社名}} の営業担当です。

EC・ネット通販の事業を運営されている御社にとって、配送品質や納期は顧客満足度に直結する重要なポイントかと存じます。

弊社では即日集荷・配送に対応しており、東京 23 区内であれば 30 分以内に集荷にお伺いできます。
単価も 280 円〜とご提供可能です。

もしご興味があれば、15 分ほどオンラインで現状の配送体制についてお話を伺えればと存じます。
ご都合のよろしいお時間を教えていただけますでしょうか?

何卒よろしくお願いいたします。`;

export function TemplateFormButton({
  mode,
  template,
  clientId
}: {
  mode: "create" | "edit";
  template?: EmailTemplate;
  clientId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const initial = {
    name: template?.name ?? "",
    subject: template?.subject ?? "",
    body: template?.body ?? "",
    active: template?.active ?? true
  };
  const [form, setForm] = useState(initial);

  function open_() {
    setForm(initial);
    setOpen(true);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r =
        mode === "create"
          ? await createTemplate({ client_id: clientId, ...form })
          : await updateTemplate(template!.id, { client_id: clientId, ...form });
      if (!r.ok) {
        toast.error(mode === "create" ? "追加失敗" : "更新失敗", { description: r.error });
        return;
      }
      toast.success(mode === "create" ? "追加しました" : "更新しました");
      setOpen(false);
      router.refresh();
    });
  }

  function onDelete() {
    if (!template) return;
    if (!confirm(`「${template.name}」を削除しますか?`)) return;
    startTransition(async () => {
      const r = await deleteTemplate(template.id);
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
        onClick={open_}
      >
        {mode === "create" ? (
          <>
            <Plus className="h-4 w-4" /> テンプレート追加
          </>
        ) : (
          <>
            <Pencil className="h-4 w-4" /> 編集
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "テンプレート追加" : "テンプレート編集"}</DialogTitle>
            <DialogDescription>
              {"{{会社名}}, {{担当者名}}, {{業種}}, {{自社名}}"} が使えます
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <Label htmlFor="tpl-name">テンプレ名(管理用)</Label>
              <Input
                id="tpl-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="A. 課題提示型 / B. メリット訴求型 など"
              />
            </div>
            <div>
              <Label htmlFor="tpl-subject">件名(30 文字以内推奨)</Label>
              <Input
                id="tpl-subject"
                required
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="{{会社名}} 様、配送コスト削減のご提案"
              />
            </div>
            <div>
              <Label htmlFor="tpl-body">本文</Label>
              <Textarea
                id="tpl-body"
                required
                rows={16}
                className="font-mono text-xs"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder={DEFAULT_BODY}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                署名・配信停止リンクは送信時に自動付与されます(顧問先設定の署名が使われる)
              </p>
            </div>

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
