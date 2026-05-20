// service_role_key で info.unsoshien@gmail.com のパスワードを再設定する。
// 実行: node --env-file=.env.local scripts/reset-password.mjs

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_ID = "8359dce9-c2bf-4802-a386-7c11f384f8a5"; // info.unsoshien@gmail.com
const NEW_PASSWORD = "SalesMailer2026!";

const { data, error } = await supabase.auth.admin.updateUserById(USER_ID, {
  password: NEW_PASSWORD,
});
if (error) throw new Error(error.message);
console.log(`✓ password updated for ${data.user.email}`);
console.log(`\nログイン情報:`);
console.log(`  Email   : info.unsoshien@gmail.com`);
console.log(`  Password: ${NEW_PASSWORD}`);
