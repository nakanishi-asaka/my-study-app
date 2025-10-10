//カレンダーのplan型定義

export interface Plan {
  id: string | null;
  title: string;
  start: Date;
  end: Date;
  color: string; // ex: "bg-purple-400"
  mode: "insert" | "update";
}
