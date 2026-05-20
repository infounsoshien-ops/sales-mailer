"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleTemplateActive } from "./actions";

export function ToggleTemplateActiveButton({
  id,
  currentActive
}: {
  id: string;
  currentActive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const r = await toggleTemplateActive(id, !currentActive);
      if (!r.ok) {
        toast.error("更新失敗", { description: r.error });
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button size="sm" variant="ghost" onClick={onClick} disabled={pending}>
      {currentActive ? "無効化" : "有効化"}
    </Button>
  );
}
