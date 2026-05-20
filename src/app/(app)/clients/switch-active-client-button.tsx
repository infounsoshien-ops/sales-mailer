"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { switchActiveClient } from "./actions";

export function SwitchActiveClientButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSwitch() {
    startTransition(async () => {
      const r = await switchActiveClient(clientId);
      if (!r.ok) {
        toast.error("切替失敗", { description: r.error });
        return;
      }
      toast.success("顧問先を切り替えました");
      router.refresh();
    });
  }

  return (
    <Button size="sm" variant="outline" onClick={onSwitch} disabled={pending}>
      {pending ? "切替中…" : "この顧問先で作業"}
    </Button>
  );
}
