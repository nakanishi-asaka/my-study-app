// YYYY-MM-DD に変換（DBのdate型に揃える）UTC基準に依存しない
export function formatDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
