"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const TemplateInput = z.object({
  client_id: z.string().uuid(),
  name: z.string().min(1, "テンプレ名は必須です").max(100),
  subject: z.string().min(1, "件名は必須です").max(300),
  body: z.string().min(1, "本文は必須です").max(8000),
  active: z.boolean().optional()
});

export type TemplateInputType = z.input<typeof TemplateInput>;

export async function createTemplate(input: TemplateInputType) {
  const parsed = TemplateInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0]?.message ?? "入力エラー" };
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "未ログインです" };

  const { error } = await supabase.from("email_templates").insert({
    client_id: parsed.data.client_id,
    name: parsed.data.name,
    subject: parsed.data.subject,
    body: parsed.data.body,
    active: parsed.data.active ?? true
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/templates");
  revalidatePath("/clients");
  return { ok: true as const };
}

export async function updateTemplate(id: string, input: TemplateInputType) {
  const parsed = TemplateInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0]?.message ?? "入力エラー" };
  const supabase = createClient();

  const { error } = await supabase
    .from("email_templates")
    .update({
      name: parsed.data.name,
      subject: parsed.data.subject,
      body: parsed.data.body,
      active: parsed.data.active ?? true
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/templates");
  return { ok: true as const };
}

export async function deleteTemplate(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("email_templates").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/templates");
  return { ok: true as const };
}

export async function toggleTemplateActive(id: string, active: boolean) {
  const supabase = createClient();
  const { error } = await supabase.from("email_templates").update({ active }).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/templates");
  return { ok: true as const };
}
