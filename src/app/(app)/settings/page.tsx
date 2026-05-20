import { redirect } from "next/navigation";

// 旧「設定」画面は顧問先単位の管理に置き換わったため、顧問先管理画面へリダイレクトする
export default function SettingsPage() {
  redirect("/clients");
}
