"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createContact, updateContact } from "./actions";
import type { Contact } from "@/lib/supabase/types";

export function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  clientId
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contact?: Contact | null;
  clientId?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    company_name: "",
    industry: "",
    person_name: "",
    email: "",
    note: ""
  });

  useEffect(() => {
    if (contact) {
      setForm({
        company_name: contact.company_name,
        industry: contact.industry ?? "",
        person_name: contact.person_name ?? "",
        email: contact.email,
        note: contact.note ?? ""
      });
    } else if (open) {
      setForm({ company_name: "", industry: "", person_name: "", email: "", note: "" });
    }
  }, [contact, open]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = contact
        ? await updateContact(contact.id, form)
        : await createContact({ ...form, client_id: clientId });
      if (!res.ok) {
        toast.error(contact ? "更新失敗" : "追加失敗", { description: res.error });
        return;
      }
      toast.success(contact ? "更新しました" : "追加しました");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{contact ? "送信先を編集" : "送信先を追加"}</DialogTitle>
          <DialogDescription>会社名とメールアドレスが必須です</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="cf-company">会社名 *</Label>
            <Input
              id="cf-company"
              required
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cf-industry">業種</Label>
              <Input
                id="cf-industry"
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cf-person">担当者名</Label>
              <Input
                id="cf-person"
                value={form.person_name}
                onChange={(e) => setForm({ ...form, person_name: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="cf-email">メールアドレス *</Label>
            <Input
              id="cf-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="cf-note">備考</Label>
            <Textarea
              id="cf-note"
              rows={3}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              キャンセル
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "保存中…" : contact ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
