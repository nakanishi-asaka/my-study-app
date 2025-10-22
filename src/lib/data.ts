// rolloverProgress, fetchTodos, toggleTodo をここに移動

import { supabase } from "../app/supabaseClient";
import { getAdjustedDateObj, getTodayInfo } from "./utils/date";
import { formatDate } from "./utils/format";

// progress の型
type ProgressRow = {
  id: string;
  user_id: string;
  template_id: string;
  is_done: boolean;
  adjusted_date: string;
  todo_templates?: TodoTemplate | null;
};

export type TodoTemplate = {
  id: string;
  title: string;
  repeat_type: "weekdays" | "weekend";
  repeat_detail?: { days: string[] } | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export async function rolloverProgress(
  userId: string,
  rolloverHour: number,
  adjustedDateArg?: Date
) {
  console.log("🌀 rolloverProgress START", {
    userId,
    rolloverHour,
    adjustedDateArg: adjustedDateArg?.toISOString(),
  });
  //現在のutc時間取得→jstに直す→今日(日付切り替え後)の情報取得
  const { adjustedDate: todayAdjusted, formattedDate: todayFormatted } =
    adjustedDateArg
      ? {
          adjustedDate: adjustedDateArg,
          formattedDate: formatDate(adjustedDateArg),
        }
      : getTodayInfo(rolloverHour);

  console.log("📅 今日の日付情報 (rollover基準)", todayFormatted);

  // 昨日を計算(rollover基準)
  const yesterdayAdjusted = new Date(todayAdjusted);
  yesterdayAdjusted.setDate(yesterdayAdjusted.getDate() - 1);

  // JSTのままformatDateに渡す
  const yesterdayFormatted = formatDate(yesterdayAdjusted);

  console.log("🧭 rolloverProgress クエリ確認", {
    targetAdjustedDate: yesterdayFormatted,
    sampleProgressDates: (
      await supabase
        .from("todo_progress")
        .select("adjusted_date")
        .eq("user_id", userId)
        .order("adjusted_date", { ascending: false })
        .limit(5)
    ).data,
  });

  //過去のprogressを取得
  const { data: oldProgress, error: progressError } = await supabase
    .from("todo_progress")
    .select("id, template_id, is_done, adjusted_date, todo_templates(title)")
    .eq("user_id", userId)
    .eq("adjusted_date", todayFormatted) //jstで今日より前
    .order("adjusted_date", { ascending: true }) //古い順
    .overrideTypes<ProgressRow[]>();

  if (progressError) {
    console.error("Failed to fetch old progress:", progressError);
    return;
  }

  if (!oldProgress || oldProgress.length === 0) {
    console.log("過去のtodo_progressはありません");
    return;
  }

  console.log("✅ 昨日のprogress取得", {
    count: oldProgress.length,
    unfinished: oldProgress.filter((p) => !p.is_done).length,
  });

  //古いprogressの日付
  const targetDate = oldProgress[0].adjusted_date;
  console.log("📅 処理対象のprogressの日付:", targetDate);

  //  未完了だけ抽出→当日のrecordsに追加
  if (oldProgress && oldProgress.length > 0) {
    const unfinished = oldProgress.filter((p) => !p.is_done);
    if (unfinished.length > 0) {
      const insertRows = unfinished.map((p) => ({
        user_id: userId,
        template_id: p.template_id,
        is_done: false,
        title: p.todo_templates?.title ?? "",
        date: targetDate, //JST＋rollover考慮済みの「progress作成日」として記録
      }));

      console.log("🟡 未完了タスク挿入予定:", insertRows.length);

      // ✅ insert → エラーなら削除しない（データ喪失防止）
      const { error: insertError } = await supabase
        .from("todo_records")
        .upsert(insertRows, { onConflict: "user_id,template_id,date" }); //recordsの重複追加防止

      if (insertError) {
        console.error(
          "Failed to insert unfinished todos into records:",
          insertError
        );
        return;
      }

      console.log("✅ 未完了タスクをrecordsに追加しました");

      //  insert 成功したら古い progress を削除
      const { error: deleteError } = await supabase
        .from("todo_progress")
        .delete()
        .eq("user_id", userId)
        .lt("adjusted_date", targetDate); //jst

      if (deleteError) {
        console.error("Failed to delete old progress:", deleteError);
      } else {
        console.log("🗑️ 古いprogressを削除完了");
      }
    }
  }
}

//最終的なtodoリストをreturnする関数
export async function fetchTodos(userId: string, rolloverHour: number) {
  console.log("🚀 fetchTodos START", {
    userId,
    nowUTC: new Date().toISOString(),
    jstNow: new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString(),
    rolloverHour,
  });

  const { adjustedDate, formattedDate, dayType } = getTodayInfo(rolloverHour);
  console.log("📅 今日の日付情報", { adjustedDate, formattedDate, dayType });

  try {
    console.log("🔁 rolloverProgress 実行開始");
    // 昨日のtodoを処理する
    await rolloverProgress(userId, rolloverHour, adjustedDate);
    console.log("✅ rolloverProgress 完了");

    // ② 今日のprogressがすでにあるか確認
    const { data: existing } = await supabase
      .from("todo_progress")
      .select("*, todo_templates(*)")
      .eq("user_id", userId)
      .eq("adjusted_date", formattedDate);

    console.log("📘 今日のprogress取得:", existing?.length || 0);

    // ③ 今日のテンプレートを取得
    const { data: templates } = await supabase
      .from("todo_templates")
      .select("*")
      .eq("user_id", userId)
      .eq("repeat_type", dayType)
      .eq("is_active", true);

    console.log("📗 有効テンプレート数:", templates?.length || 0);

    // dayType に合致する is_active=true の template を抽出
    if (templates) {
      const validTemplates = templates;

      if (!existing || existing.length === 0) {
        // progress が無ければ新規生成（リセット）
        const insertRows = validTemplates.map((t) => ({
          user_id: userId,
          template_id: t.id,
          adjusted_date: formattedDate,
          is_done: false,
        }));
        if (insertRows.length > 0) {
          await supabase.from("todo_progress").upsert(insertRows, {
            onConflict: "user_id,template_id,adjusted_date", // 重複回避
          });
        }
      } else {
        // progress がある場合 → 差分調整
        const existingIds = existing.map((e) => e.template_id);
        const validIds = validTemplates.map((t) => t.id);

        // is_active=false or repeat_type不一致 の progress を削除
        const toDelete = existingIds.filter((id) => !validIds.includes(id));
        if (toDelete.length > 0) {
          await supabase
            .from("todo_progress")
            .delete()
            .eq("user_id", userId)
            .eq("adjusted_date", formattedDate)
            .in("template_id", toDelete);
        }

        // 新しい todoがあれば、progress に追加
        const toAdd = validTemplates.filter((t) => !existingIds.includes(t.id));
        if (toAdd.length > 0) {
          const insertRows = toAdd.map((t) => ({
            user_id: userId,
            template_id: t.id,
            adjusted_date: formattedDate,
            is_done: false,
          }));
          await supabase.from("todo_progress").insert(insertRows);
        }
      }
    }

    // 今日の progress を再取得
    const { data, error } = await supabase
      .from("todo_progress")
      .select(
        `id,
           template_id,
           is_done,
           updated_at,
           todo_templates(id,title)`
      )
      .eq("user_id", userId)
      .eq("adjusted_date", formattedDate)
      .order("updated_at", { ascending: true })
      .overrideTypes<ProgressRow[], { merge: false }>();

    if (error) throw error;
    console.log("📦 fetchTodos 完了 (件数:", data?.length || 0, ")");

    // title をフラット化
    return (data || []).map((d) => ({
      ...d,
      title: d.todo_templates?.title ?? "",
    }));
  } catch (err) {
    console.error("fetchTodos error:", err);
    return [];
  }
}

//todo完了処理
export async function toggleTodo(
  user: { id: string },
  todo: any,
  rolloverHour: number
) {
  if (!user?.id) return;

  try {
    //今日の日付を取得(rollover基準)
    const { adjustedDate, formattedDate } = getTodayInfo(rolloverHour);

    // --- Step 2: デバッグ出力 ---
    const now = new Date();
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    console.log("🕒 toggleTodo DEBUG =======");
    console.log("UTC now:        ", now.toISOString());
    console.log("JST now:        ", jstNow.toISOString());
    console.log("rolloverHour:   ", rolloverHour);
    console.log("adjustedDate:   ", adjustedDate.toISOString());
    console.log("formattedDate:  ", formattedDate);
    console.log("todo.id:        ", todo.id);
    console.log("todo.template_id:", todo.template_id);
    console.log("===========================");

    const newDone = !todo.is_done;

    // progressのis_doneを 更新
    const { error: progressError } = await supabase
      .from("todo_progress")
      .update({
        is_done: newDone,
        done_at: newDone ? new Date().toISOString() : null,
      })
      .eq("id", todo.id);

    if (progressError) throw progressError;

    //それぞれrecordsを更新
    if (newDone) {
      // 完了 → 今日の日付でupsert
      const { error: recordError } = await supabase.from("todo_records").upsert(
        [
          {
            user_id: user.id,
            template_id: todo.template_id,
            is_done: true,
            title: todo.todo_templates.title ?? "",
            date: formattedDate, //rollover基準の日付
          },
        ],
        { onConflict: "user_id,template_id,date" }
      );

      if (recordError) throw recordError;
    } else {
      // 完了取り消し → その日の records を削除
      const { error: deleteError } = await supabase
        .from("todo_records")
        .delete()
        .eq("user_id", user.id)
        .eq("template_id", todo.template_id)
        .eq("date", formattedDate);

      if (deleteError) throw deleteError;
    }

    await fetchTodos(user.id, rolloverHour);
  } catch (err) {
    console.error("toggleTodo error:", err);
  }
}
