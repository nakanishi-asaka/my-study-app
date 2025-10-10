//カレンダーページのplan関連→DBアクセスまとめ

import { Plan } from "@/types/plan";
import { supabase } from "../../app/supabaseClient";

function toDateString(date: Date | string | null | undefined) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    console.warn("⚠️ Invalid date detected:", date);
    return null;
  }
  // ローカル時間基準で日付文字列を生成
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`; // JST基準
}

export async function upsertPlan(
  userId: string,
  plan: Plan,
  mode: "insert" | "update"
) {
  console.log("📦 upsertPlan開始:", { mode, plan });

  const start_date = toDateString(plan.start);
  const end_date = toDateString(plan.end);

  if (!start_date || !end_date) {
    console.error("❌ start_date または end_date が不正です:", {
      start_date,
      end_date,
      plan,
    });
    return null;
  }
  // DB に渡すペイロード
  const payload: any = {
    title: plan.title,
    start_date,
    end_date,
    color: plan.color.replace("bg-", "").replace("-400", ""),
    user_id: userId,
  };

  // update の場合は id が必須
  if (mode === "update" && !plan.id) {
    console.log("❌ plan.id が未定義です。更新できません。", plan);
    return null;
  }

  const query =
    mode === "insert"
      ? supabase.from("plans").insert([payload]).select()
      : supabase
          .from("plans")
          .update(payload)
          .eq("id", plan.id)
          .eq("user_id", userId)
          .select();

  const { data, error } = await query;

  if (error) {
    console.error("DB error:", error.message);
    return null;
  }

  return data;
}

export async function deletePlan(userId: string, planId: string | null) {
  try {
    const { error } = await supabase
      .from("plans")
      .delete()
      .eq("id", planId)
      .eq("user_id", userId);

    if (error) throw error;

    console.log(`✅ Plan deleted (id: ${planId})`);
    return true;
  } catch (error: any) {
    console.error("❌ deletePlan error:", error.message);
    return false;
  }
}
