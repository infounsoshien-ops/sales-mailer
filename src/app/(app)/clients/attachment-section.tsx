"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Paperclip, Check, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  checkClientAttachment,
  deleteClientAttachmentAction,
  uploadClientAttachmentAction,
} from "./actions";

/**
 * 顧問先編集モーダル内で表示する PDF 添付ファイル管理セクション。
 *
 * - 既に PDF があれば「✓ 添付済み」+ 削除ボタン
 * - 無ければ「ファイル選択 → アップロード」
 */
export function AttachmentSection({ clientId }: { clientId: string }) {
  const [exists, setExists] = useState<boolean | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初回 / clientId 変化時に状態取得
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await checkClientAttachment(clientId);
      if (cancelled) return;
      if (r.ok) setExists(r.exists);
      else setExists(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  function onUploadClick() {
    fileInputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("ファイルサイズが大きすぎます", {
        description: "5MB 以下の PDF を選択してください",
      });
      e.target.value = "";
      return;
    }
    const fd = new FormData();
    fd.set("clientId", clientId);
    fd.set("file", file);
    startTransition(async () => {
      const r = await uploadClientAttachmentAction(fd);
      if (!r.ok) {
        toast.error("アップロード失敗", { description: r.error });
        return;
      }
      toast.success("PDF をアップロードしました");
      setExists(true);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function onDelete() {
    if (!confirm("添付 PDF を削除しますか?")) return;
    startTransition(async () => {
      const r = await deleteClientAttachmentAction(clientId);
      if (!r.ok) {
        toast.error("削除失敗", { description: r.error });
        return;
      }
      toast.success("削除しました");
      setExists(false);
    });
  }

  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        添付資料 (PDF)
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        この顧問先から送る全メールに自動で添付されます。1 ファイル、5MB 以下、PDF のみ。
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={onFileChange}
      />

      {exists === null ? (
        <div className="text-xs text-muted-foreground">読み込み中…</div>
      ) : exists ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Check className="h-4 w-4" /> 添付済み
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onUploadClick}
              disabled={pending}
            >
              <Upload className="h-4 w-4" /> 差し替え
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
              disabled={pending}
            >
              <Trash2 className="h-4 w-4" /> 削除
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onUploadClick}
          disabled={pending}
        >
          <Upload className="h-4 w-4" /> {pending ? "アップロード中…" : "PDF を選択"}
        </Button>
      )}
    </div>
  );
}
