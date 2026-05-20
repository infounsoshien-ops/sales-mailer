"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("パスワードは 8 文字以上にしてください");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    setLoading(false);
    if (error) {
      toast.error("登録に失敗しました", { description: error.message });
      return;
    }
    toast.success("確認メールを送信しました", {
      description: "受信箱を確認してリンクをクリックしてください"
    });
    router.push("/login");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>新規登録</CardTitle>
        <CardDescription>メールアドレスとパスワードを設定してください</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">パスワード(8文字以上)</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "登録中…" : "登録"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            既にアカウントをお持ちの方は{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              ログイン
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
