// rolloverProgress, fetchTodos, toggleTodo をここに移動

import { supabase } from "../app/supabaseClient";
import { getTodayInfo } from "./utils/date";
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
  //今日(日付切り替え後)の情報取得
  const { adjustedDate: todayAdjusted, formattedDate: todayFormatted } =
    adjustedDateArg
      ? {
          adjustedDate: adjustedDateArg,
          formattedDate: formatDate(adjustedDateArg),
        }
      : getTodayInfo(rolloverHour);

  // 昨日を計算(rollover基準)
  const yesterday = new Date(todayAdjusted);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayFormatted = formatDate(yesterday);

  //昨日のprogressを取得
  const { data: oldProgress, error: progressError } = await supabase
    .from("todo_progress")
    .select("id, template_id, is_done, adjusted_date, todo_templates(title)")
    .eq("user_id", userId)
    .eq("adjusted_date", yesterdayFormatted)
    .overrideTypes<ProgressRow[]>();

  if (progressError) {
    console.error("Failed to fetch old progress:", progressError);
    return;
  }

  if (!oldProgress || oldProgress.length === 0) {
    console.log("昨日のtodo_progressはありません");
    return;
  }

  //  未完了だけ抽出→当日のrecordsに追加
  if (oldProgress && oldProgress.length > 0) {
    const unfinished = oldProgress.filter((p) => !p.is_done);
    if (unfinished.length > 0) {
      const insertRows = unfinished.map((p) => ({
        user_id: userId,
        template_id: p.template_id,
        is_done: false,
        title: p.todo_templates?.title ?? "",
        date: yesterdayFormatted, //JST＋rollover考慮済みの「昨日」として記録、UTCズレ防止
      }));

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

      //  insert 成功したら古い progress を削除
      const { error: deleteError } = await supabase
        .from("todo_progress")
        .delete()
        .eq("user_id", userId)
        .lt("adjusted_date", todayFormatted);

      if (deleteError) {
        console.error("Failed to delete old progress:", deleteError);
      }
    }
  }
}

//最終的なtodoリストをreturnする関数
export async function fetchTodos(userId: string, rolloverHour: number) {
  const { adjustedDate, formattedDate, dayType } = getTodayInfo(rolloverHour);

  try {
    // ① 前日未完了タスクを引き継ぐ
    await rolloverProgress(userId, rolloverHour, adjustedDate);

    // ② 今日のprogressがすでにあるか確認
    const { data: existing } = await supabase
      .from("todo_progress")
      .select("*, todo_templates(*)")
      .eq("user_id", userId)
      .eq("adjusted_date", formattedDate);

    // ③ 今日のテンプレートを取得
    const { data: templates } = await supabase
      .from("todo_templates")
      .select("*")
      .eq("user_id", userId)
      .eq("repeat_type", dayType)
      .eq("is_active", true);

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
