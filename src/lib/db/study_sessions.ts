import { supabase } from "../../app/supabaseClient";
import { formatDate } from "../utils/format";

//学習時間をテーブルに保存
export async function insertStudySession(userId: string, totalMinutes: number) {
  const today = formatDate(new Date());

  const { data, error } = await supabase
    .from("study_sessions")
    .insert([
      { user_id: userId, study_date: today, study_minutes: totalMinutes },
    ])
    .select();

  if (error) {
    console.error("学習時間 insert 失敗:", error.message);
    throw error;
  }

  return { data, error };
}
