//カレンダーのplan型定義

//コンポーネント等で使う用
export interface Plan {
  id: string | null;
  title: string;
  start: Date;
  end: Date;
  color: string; // ex: "bg-purple-400"
  mode: "insert" | "update";
}

//DB送信用
export interface DBPlanPayload {
  id?: string | null;
  title: string;
  start_date: string; // ISO文字列 or "YYYY-MM-DD"
  end_date: string;
  color: string;
  user_id: string;
}
