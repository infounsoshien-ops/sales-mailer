// Supabase Auth に本番 URL を許可させるための情報を出力するだけ。
// (Supabase Auth 設定は SQL ではなく Dashboard / Management API 経由なので、
//  service_role_key では変更できない。手動設定の URL を案内する)

const PROD_URL = "https://infounsoshien-sales-mailer.vercel.app";

console.log("Supabase Dashboard で以下を設定してください:\n");
console.log("https://supabase.com/dashboard/project/unzklyzrlbkbgjwavynt/auth/url-configuration\n");
console.log(`  Site URL:`);
console.log(`    ${PROD_URL}`);
console.log(`\n  Redirect URLs (Add URL ボタンで追加):`);
console.log(`    ${PROD_URL}/auth/callback`);
console.log(`    ${PROD_URL}/**`);
console.log(`    http://localhost:3000/auth/callback     ← ローカル開発用に残しておく`);
console.log(`    http://localhost:3001/auth/callback     ← ローカル開発用に残しておく`);
