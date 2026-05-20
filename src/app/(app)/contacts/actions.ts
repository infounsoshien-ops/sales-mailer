"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ContactStatus } from "@/lib/supabase/types";

const ContactInputSchema = z.object({
  client_id: z.string().uuid("顧問先が選択されていません").optional(),
  company_name: z.string().min(1).max(200),
  industry: z.string().max(100).nullable().optional(),
  person_name: z.string().max(100).nullable().optional(),
  email: z.string().email().max(200),
  note: z.string().max(2000).nullable().optional()
});
export type ContactInput = z.input<typeof ContactInputSchema>;

export async function createContact(input: ContactInput) {
  const parsed = ContactInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "入力エラー" };
  }
  if (!parsed.data.client_id) {
    return { ok: false as const, error: "顧問先が選択されていません" };
  }
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "未ログインです" };

  const { error } = await supabase.from("contacts").insert({
    user_id: user.id,
    client_id: parsed.data.client_id,
    company_name: parsed.data.company_name,
    industry: parsed.data.industry ?? null,
    person_name: parsed.data.person_name ?? null,
    email: parsed.data.email,
    note: parsed.data.note ?? null
  });
  if (error) {
    if (error.code === "23505") return { ok: false as const, error: "同じメールアドレスが既に登録されています" };
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/contacts");
  return { ok: true as const };
}

export async function updateContact(id: string, input: Partial<ContactInput>) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "未ログインです" };

  const update: Record<string, unknown> = {};
  if (input.company_name !== undefined) update.company_name = input.company_name;
  if (input.industry !== undefined) update.industry = input.industry || null;
  if (input.person_name !== undefined) update.person_name = input.person_name || null;
  if (input.email !== undefined) update.email = input.email;
  if (input.note !== undefined) update.note = input.note || null;

  const { error } = await supabase.from("contacts").update(update).eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/contacts");
  return { ok: true as const };
}

export async function deleteContact(id: string) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "未ログインです" };

  const { error } = await supabase.from("contacts").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/contacts");
  return { ok: true as const };
}

export async function toggleReplied(id: string, replied: boolean) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "未ログインです" };

  const update: Record<string, unknown> = {
    replied,
    replied_at: replied ? new Date().toISOString() : null
  };
  // 返信フラグを立てるとステータスを replied に更新(明示的に他のステータスへ戻す手段は提供)
  if (replied) update.status = "replied";

  const { error } = await supabase.from("contacts").update(update).eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/contacts");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function updateContactStatus(id: string, status: ContactStatus) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "未ログインです" };

  const { error } = await supabase
    .from("contacts")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/contacts");
  return { ok: true as const };
}

const BulkInputSchema = z.object({
  client_id: z.string().uuid("顧問先が選択されていません"),
  rows: z.array(ContactInputSchema)
});

export async function bulkImportContacts(input: z.input<typeof BulkInputSchema>) {
  const parsed = BulkInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "入力フォーマットが不正です", inserted: 0, duplicates: 0 };
  }
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "未ログインです", inserted: 0, duplicates: 0 };

  // 同じ顧問先内での重複のみチェック(顧問先が違えば同じメアド可)
  const emails = parsed.data.rows.map((r) => r.email.toLowerCase());
  const { data: existing } = await supabase
    .from("contacts")
    .select("email")
    .eq("client_id", parsed.data.client_id)
    .in("email", emails);
  const existingSet = new Set<string>((existing ?? []).map((r: { email: string }) => r.email.toLowerCase()));

  const toInsert = parsed.data.rows
    .filter((r) => !existingSet.has(r.email.toLowerCase()))
    .map((r) => ({
      user_id: user.id,
      client_id: parsed.data.client_id,
      company_name: r.company_name,
      industry: r.industry ?? null,
      person_name: r.person_name ?? null,
      email: r.email,
      note: r.note ?? null
    }));

  if (toInsert.length === 0) {
    return {
      ok: true as const,
      inserted: 0,
      duplicates: parsed.data.rows.length,
      error: null
    };
  }

  const { error } = await supabase.from("contacts").insert(toInsert);
  if (error) return { ok: false as const, error: error.message, inserted: 0, duplicates: 0 };

  revalidatePath("/contacts");
  revalidatePath("/dashboard");
  return {
    ok: true as const,
    inserted: toInsert.length,
    duplicates: parsed.data.rows.length - toInsert.length,
    error: null
  };
}
