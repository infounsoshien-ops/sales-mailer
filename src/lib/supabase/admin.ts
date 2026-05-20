import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service Role キーを使った admin クライアント。
 * RLS をバイパスするので Cron / Webhook など、信頼できるサーバー処理でのみ使う。
 * ブラウザに公開しないこと。
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
