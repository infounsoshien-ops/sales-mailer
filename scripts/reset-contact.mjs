// 送信済みコンタクトを pending に戻して再送できるようにする。
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from("contacts")
  .update({ status: "pending" })
  .eq("email", "yingrensongqi613@gmail.com")
  .select();
if (error) throw new Error(error.message);
console.log(`reset ${data.length} contact(s) to pending`);
for (const c of data) console.log(`  ${c.id} ${c.email} → status=${c.status}`);
