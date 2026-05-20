"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContactFormDialog } from "./contact-form-dialog";
import { UploadCsvDialog } from "./upload-csv-dialog";

const STATUS_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "pending", label: "未送信" },
  { value: "sent", label: "送信済み" },
  { value: "replied", label: "返信あり" },
  { value: "unsubscribed", label: "配信停止" },
  { value: "failed", label: "失敗" }
];

export function ContactsToolbar({
  currentQuery,
  currentStatus,
  currentIndustry,
  industries,
  clientId
}: {
  currentQuery: string;
  currentStatus: string;
  currentIndustry: string;
  industries: string[];
  clientId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(currentQuery);
  const [newOpen, setNewOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all" && value !== "") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/contacts?${params.toString()}`);
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    updateParam("q", query);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form onSubmit={onSearch} className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="会社名で検索"
          className="pl-9"
        />
      </form>

      <Select value={currentStatus} onValueChange={(v) => updateParam("status", v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="ステータス" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentIndustry || "__all__"} onValueChange={(v) => updateParam("industry", v === "__all__" ? "" : v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="業種" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">すべての業種</SelectItem>
          {industries.map((i) => (
            <SelectItem key={i} value={i}>
              {i}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="ml-auto flex gap-2">
        <Button variant="outline" onClick={() => setCsvOpen(true)}>
          <Upload className="h-4 w-4" /> CSV 取込
        </Button>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4" /> 新規追加
        </Button>
      </div>

      <ContactFormDialog open={newOpen} onOpenChange={setNewOpen} clientId={clientId} />
      <UploadCsvDialog open={csvOpen} onOpenChange={setCsvOpen} clientId={clientId} />
    </div>
  );
}
