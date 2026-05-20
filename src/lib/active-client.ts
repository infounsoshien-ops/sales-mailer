import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/lib/supabase/types";

/**
 * ログインユーザーの顧問先一覧と、現在選択中の顧問先を返す。
 * 1 つも顧問先が無ければ null を返す(画面側で「顧問先を作成してください」UI に分岐させる)。
 */
export async function getActiveClient(): Promise<{
  clients: Client[];
  active: Client | null;
  userId: string | null;
}> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { clients: [], active: null, userId: null };

  const [{ data: clientsData }, { data: settingsData }] = await Promise.all([
    supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase.from("user_settings").select("current_client_id").eq("user_id", user.id).maybeSingle()
  ]);

  const clients = ((clientsData as Client[] | null) ?? []) as Client[];
  if (clients.length === 0) return { clients, active: null, userId: user.id };

  const currentId = settingsData?.current_client_id as string | undefined;
  let active = currentId ? clients.find((c) => c.id === currentId) ?? null : null;
  if (!active) {
    active = clients[0];
    // 未選択 / 不正な ID なら最初の顧問先を current に設定
    await supabase.from("user_settings").upsert(
      { user_id: user.id, current_client_id: active.id },
      { onConflict: "user_id" }
    );
  }

  return { clients, active, userId: user.id };
}
