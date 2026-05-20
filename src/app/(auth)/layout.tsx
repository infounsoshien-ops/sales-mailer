import { Send } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-full bg-primary/10 p-3">
            <Send className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">営業メール送信ツール</h1>
          <p className="text-sm text-muted-foreground">
            EC・ネット通販向けラストワンマイル配送の営業を効率化
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
