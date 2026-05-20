"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { decodeToUtf8, parseContactsCsv, type CsvParseResult } from "@/lib/csv";
import { bulkImportContacts } from "./actions";

export function UploadCsvDialog({
  open,
  onOpenChange,
  clientId
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
}) {
  const [parsed, setParsed] = useState<CsvParseResult | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleFile(file: File) {
    setFilename(file.name);
    const buf = await file.arrayBuffer();
    const { text, encoding } = decodeToUtf8(buf);
    const result = parseContactsCsv(text);
    setParsed({ ...result, encoding });
  }

  function onSubmit() {
    if (!parsed || parsed.rows.length === 0) {
      toast.error("登録できる行がありません");
      return;
    }
    startTransition(async () => {
      const res = await bulkImportContacts({ client_id: clientId, rows: parsed.rows });
      if (!res.ok) {
        toast.error("取込失敗", { description: res.error ?? undefined });
        return;
      }
      toast.success("CSV 取込完了", {
        description: `登録: ${res.inserted} 件 / 重複スキップ: ${res.duplicates} 件`
      });
      reset();
      onOpenChange(false);
    });
  }

  function reset() {
    setParsed(null);
    setFilename(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>CSV を取り込み</DialogTitle>
          <DialogDescription>
            UTF-8 / Shift-JIS を自動判別します。必須列: 会社名, メールアドレス / 任意列: 業種, 担当者名, 備考
          </DialogDescription>
        </DialogHeader>

        {!parsed ? (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed bg-slate-50 px-6 py-12 text-sm text-muted-foreground hover:bg-slate-100">
            <Upload className="h-8 w-8" />
            <span className="font-medium">クリックして CSV ファイルを選択</span>
            <span className="text-xs">.csv ファイル(UTF-8 または Shift-JIS)</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="font-medium">{filename}</span>
              <span className="text-xs text-muted-foreground">(エンコーディング: {parsed.encoding})</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="space-y-1 p-4">
                  <div className="text-xs text-muted-foreground">取込可能</div>
                  <div className="text-2xl font-bold text-emerald-600">{parsed.rows.length} 件</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-1 p-4">
                  <div className="text-xs text-muted-foreground">エラー</div>
                  <div className={`text-2xl font-bold ${parsed.errors.length ? "text-destructive" : "text-muted-foreground"}`}>
                    {parsed.errors.length} 件
                  </div>
                </CardContent>
              </Card>
            </div>

            {parsed.errors.length > 0 && (
              <div className="max-h-48 overflow-auto rounded-md border bg-red-50 p-3 text-sm">
                <div className="mb-2 flex items-center gap-2 font-medium text-red-700">
                  <AlertCircle className="h-4 w-4" /> エラー詳細
                </div>
                <ul className="space-y-1">
                  {parsed.errors.slice(0, 30).map((e, i) => (
                    <li key={i} className="text-xs text-red-700">
                      行 {e.row}: {e.message}
                    </li>
                  ))}
                  {parsed.errors.length > 30 && (
                    <li className="text-xs italic text-red-600">…他 {parsed.errors.length - 30} 件</li>
                  )}
                </ul>
              </div>
            )}

            <Button variant="ghost" size="sm" onClick={reset} disabled={pending}>
              別のファイルを選ぶ
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            キャンセル
          </Button>
          <Button onClick={onSubmit} disabled={pending || !parsed || parsed.rows.length === 0}>
            {pending ? "取込中…" : `${parsed?.rows.length ?? 0} 件を取り込む`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
