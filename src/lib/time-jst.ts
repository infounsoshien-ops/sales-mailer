/**
 * JST(Asia/Tokyo)時刻ユーティリティ。
 * Vercel Cron は UTC で動くので、ユーザー設定の send_time / 土日判定は JST 基準で行う。
 */

export function nowInJst(): {
  date: string; // "YYYY-MM-DD"
  hhmm: string; // "HH:MM"
  dayOfWeek: number; // 0=Sun .. 6=Sat
  utcMidnightOfJstDay: Date; // UTC で表す「今日 JST の 00:00:00」
} {
  const now = new Date();
  // sv-SE ロケールは "YYYY-MM-DD HH:MM:SS" を返す
  const jstString = now.toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" });
  const date = jstString.slice(0, 10);
  const time = jstString.slice(11, 16);

  // 曜日(JSTで)
  const jstDate = new Date(`${date}T00:00:00+09:00`);
  const dayOfWeek = jstDate.getUTCDay();

  return {
    date,
    hhmm: time,
    dayOfWeek,
    utcMidnightOfJstDay: jstDate
  };
}

export function isWeekend(dayOfWeek: number): boolean {
  return dayOfWeek === 0 || dayOfWeek === 6;
}

export function isTimeReached(currentHhmm: string, targetHhmm: string): boolean {
  // 文字列比較で OK("09:00" <= "10:00" は文字列順でも正しい)
  return currentHhmm >= targetHhmm;
}
