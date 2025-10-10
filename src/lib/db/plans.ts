//カレンダーページのplan関連→DBアクセスまとめ

import { Plan } from "@/types/plan";
import { supabase } from "../../app/supabaseClient";

function toDateString(date: Date) {
  return date.toISOString().split("T")[0];
}

export async function upsertPlan(
  userId: string,
  plan: Plan,
  mode: "insert" | "update"
) {
  console.log("📦 upsertPlan開始:", { mode, plan });

  // DB に渡すペイロード
  const payload: any = {
    title: plan.title,
    start_date: toDateString(plan.start), // ✅ "YYYY-MM-DD"
    end_date: toDateString(plan.end),
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
