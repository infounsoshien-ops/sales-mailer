"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const ClientSchema = z.object({
  name: z.string().min(1, "顧問先名は必須です").max(200),
  service_description: z.string().max(500).optional().or(z.literal("").transform(() => undefined)),
  strengths: z.string().max(2000).optional().or(z.literal("").transform(() => undefined)),
  signature: z.string().max(2000).optional().or(z.literal("").transform(() => undefined)),
  from_email: z
    .string()
    .email("正しいメールアドレスを入力してください")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  daily_limit: z.number().int().min(1).max(100),
  send_time: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM 形式で入力してください"),
  skip_weekends: z.boolean(),
  active: z.boolean().optional()
});

export type ClientInput = z.input<typeof ClientSchema>;

export async function createClientRecord(input: ClientInput) {
  const parsed = ClientSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "入力エラー" };
  }
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "未ログインです" };

  const { data, error } = await supabase
    .from("clients")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      service_description: parsed.data.service_description ?? null,
      strengths: parsed.data.strengths ?? null,
      signature: parsed.data.signature ?? null,
      from_email: parsed.data.from_email ?? null,
      daily_limit: parsed.data.daily_limit,
      send_time: parsed.data.send_time,
      skip_weekends: parsed.data.skip_weekends
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };

  // 初回作成なら current に設定
  await supabase.from("user_settings").upsert(
    { user_id: user.id, current_client_id: (data as { id: string }).id },
    { onConflict: "user_id", ignoreDuplicates: false }
  );

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { ok: true as const, id: (data as { id: string }).id };
}

export async function updateClientRecord(id: string, input: ClientInput) {
  const parsed = ClientSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "入力エラー" };
  }
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "未ログインです" };

  const { error } = await supabase
    .from("clients")
    .update({
      name: parsed.data.name,
      service_description: parsed.data.service_description ?? null,
      strengths: parsed.data.strengths ?? null,
      signature: parsed.data.signature ?? null,
      from_email: parsed.data.from_email ?? null,
      daily_limit: parsed.data.daily_limit,
      send_time: parsed.data.send_time,
      skip_weekends: parsed.data.skip_weekends,
      active: parsed.data.active ?? true
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/clients");
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function deleteClientRecord(id: string) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "未ログインです" };

  const { error } = await supabase.from("clients").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function switchActiveClient(clientId: string) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "未ログインです" };

  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, current_client_id: clientId }, { onConflict: "user_id" });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true as const };
}
