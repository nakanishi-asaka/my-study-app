// utils/format.ts

//YYYY-MM-DD　にする関数
export function formatDate(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;

  // JSTへ補正 (+9時間)
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);

  return `${jst.getUTCFullYear()}-${(jst.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}-${jst.getUTCDate().toString().padStart(2, "0")}`;
}
