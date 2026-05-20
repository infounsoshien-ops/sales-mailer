"use client";

import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <form action="/auth/logout" method="post">
      <button
        type="submit"
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
      >
        <LogOut className="h-4 w-4" />
        ログアウト
      </button>
    </form>
  );
}
