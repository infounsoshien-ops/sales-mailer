import { Badge } from "@/components/ui/badge";
import type { ContactStatus } from "@/lib/supabase/types";

const STATUS_CONFIG: Record<ContactStatus, { label: string; variant: "muted" | "default" | "success" | "warning" | "destructive" }> = {
  pending: { label: "未送信", variant: "muted" },
  sent: { label: "送信済み", variant: "default" },
  replied: { label: "返信あり", variant: "success" },
  unsubscribed: { label: "配信停止", variant: "warning" },
  failed: { label: "失敗", variant: "destructive" }
};

export function StatusBadge({ status }: { status: ContactStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
