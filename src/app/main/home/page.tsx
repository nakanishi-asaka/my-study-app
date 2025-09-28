"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../../supabaseClient";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";

import { isWeekend } from "date-fns";

type Profile = {
  exam_date: string | null;
};

//学習統計の型
type StudyStats = {
  weekly_hours: number;
  streak_days: number;
  total_completed: number;
  weekday_minutes: number;
  weekend_minutes: number;
};

// 平日/休日判定
function getDayType(dayRolloverHour: number): "weekdays" | "weekend" {
  const rollover = typeof dayRolloverHour === "number" ? dayRolloverHour : 3; // デフォルト3時
  const now = new Date();

  //rolloverHourを引いた時刻を計算
  const adjusted = new Date(now.getTime() - rollover * 60 * 60 * 1000);
  const day = adjusted.getDay(); // 0=日,1=月,…,6=土
  return day === 0 || day === 6 ? "weekend" : "weekdays";
}

//試験日カウントダウン
function getCountdown(targetDate: Date) {
  const today = new Date();
  const diff = targetDate.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ユーザーごとの adjusted_date を計算する関数
function getAdjustedDate(dayRolloverHour: number): string {
  const rollover = typeof dayRolloverHour === "number" ? dayRolloverHour : 3; // デフォルト3時
  const now = new Date();
  // 現在時刻から dayRolloverHour を引いた時刻を計算
  const adjusted = new Date(now.getTime() - dayRolloverHour * 60 * 60 * 1000);
  return adjusted.toISOString().slice(0, 10);
}

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [examDate, setExamDate] = useState<Date | null>(null);

  const [studyStats, setStudyStats] = useState<StudyStats | null>(null);
  const [todos, setTodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [repeatType, setRepeatType] = useState<"weekdays" | "weekend">(
    "weekdays"
  );
  const [open, setOpen] = useState(false);
  const [editTodo, setEditTodo] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [weekendOpen, setWeekendOpen] = useState(false);
  const [dayRolloverHour, setDayRolloverHour] = useState<number>(3);

  //モーダルでtodo表示用
  const [weekdayTodos, setWeekdayTodos] = useState<any[]>([]);
  const [weekendTodos, setWeekendTodos] = useState<any[]>([]);

  //モーダルでtodo表示用
  const today = new Date();
  const weekend = isWeekend(today); // 土日かどうか判定

  // ✅ クライアント側で session を取得してユーザー設定 + デバッグ
  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      console.log("getSession result:", data); // デバッグ出力
      if (error) console.error("getSession error:", error);
      if (!data?.session) {
        console.warn("未ログイン状態 (getSession)");
      } else {
        console.log("ログイン済みユーザー:", data.session.user);
        setUser(data.session.user);
        await fetchTodos(data.session.user.id);
      }
    };
    init();

    // ✅ セッション変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session);
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ✅ exam_date を profiles から取得
  useEffect(() => {
    if (!user?.id) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("exam_date")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("fetchProfile error:", error);
        return;
      }
      if (data?.exam_date) {
        setExamDate(new Date(data.exam_date));
      }
    };

    fetchProfile();
  }, [user]);

  // ✅ カウントダウン計算
  const countdown = examDate ? getCountdown(examDate) : 0;

  // useEffectで学習統計を取得
  useEffect(() => {
    if (!user?.id) return;

    const fetchStats = async () => {
      try {
        // 今週分(存在しない場合あり)
        const { data: weekly, error } = await supabase
          .from("weekly_summary")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("weekly_summary error:", error);
        }

        // 累計分
        const { data: total } = await supabase
          .from("total_summary")
          .select("*")
          .eq("user_id", user.id)
          .single();

        setStudyStats({
          weekly_hours: (weekly?.week_total_minutes ?? 0) / 60,
          streak_days: total?.current_streak_days ?? 0, // ← ✅ streak 日数を格納
          total_completed: total?.total_completed_todos ?? 0,
          weekday_minutes: (total?.weekday_minutes ?? 0) / 60,
          weekend_minutes: (total?.weekend_minutes ?? 0) / 60,
        });
      } catch (err) {
        console.error("fetchStats error:", err);
      }
    };

    fetchStats();
  }, [user]);

  //モーダルでtodo表示用
  useEffect(() => {
    const fetchTodos = async () => {
      // 平日用
      const { data: weekdayData, error: weekdayError } = await supabase
        .from("todo_templates")
        .select("*")
        .eq("repeat_type", "weekdays")
        .eq("is_active", true);

      if (weekdayError) console.error(weekdayError);
      setWeekdayTodos(weekdayData || []);

      // 休日用
      const { data: weekendData, error: weekendError } = await supabase
        .from("todo_templates")
        .select("*")
        .eq("repeat_type", "weekend")
        .eq("is_active", true);

      if (weekendError) console.error(weekendError);
      setWeekendTodos(weekendData || []);
    };

    fetchTodos();
  }, []);

  // progress の rollover(過去分の処理)
  const rolloverProgress = async (userId: string, rolloverHour: number) => {
    const today = getAdjustedDate(rolloverHour);

    // 昨日以前の progress を取得
    const { data: oldProgress } = await supabase
      .from("todo_progress")
      .select("id, template_id, is_done, adjusted_date, todo_templates(title)")
      .eq("user_id", userId)
      .lt("adjusted_date", today); // 昨日以前
    console.log("oldProgress:", oldProgress);

    if (oldProgress && oldProgress.length > 0) {
      // 未完了だけ records に保存
      const unfinished = oldProgress.filter((p) => !p.is_done);
      if (unfinished.length > 0) {
        const insertRows = unfinished.map((p) => ({
          user_id: userId,
          template_id: p.template_id,
          is_done: false,
          title: p.todo_templates?.title ?? "",
          date: p.adjusted_date, //当日扱いの日付
        }));
        await supabase.from("todo_records").insert(insertRows, {
          ignoreDuplicates: true,
        });
      }

      // 古い progress を削除
      await supabase
        .from("todo_progress")
        .delete()
        .eq("user_id", userId)
        .lt("adjusted_date", today);
    }
  };

  // 最新の todo を取得
  const fetchTodos = async (userId: string) => {
    setLoading(true);
    try {
      // 1. ユーザーの rolloverHour を取得
      const { data: profile } = await supabase
        .from("profiles")
        .select("day_rollover_hour")
        .eq("id", userId)
        .single();

      const rolloverHour = profile?.day_rollover_hour ?? 3; // デフォルト3時

      //今日の日付を取得(rollover基準なので、深夜は前日扱い)
      const today = getAdjustedDate(rolloverHour);

      //曜日を判定
      const dayType = getDayType(rolloverHour);

      // ✅ rollover 処理(昨日の未完了を保存、古い progress 削除、今日の progress 調整)
      await rolloverProgress(userId, rolloverHour);

      // 今日の progress を取得
      const { data: existing } = await supabase
        .from("todo_progress")
        .select("id, template_id, is_done")
        .eq("user_id", userId)
        .eq("adjusted_date", today);

      // ✅ 今日の templateを取得
      const { data: templates } = await supabase
        .from("todo_templates")
        .select("id, title, repeat_type, is_active")
        .eq("user_id", userId);

      // dayType に合致する is_active=true の template を抽出
      if (templates) {
        const validTemplates = templates.filter(
          (t) => t.repeat_type === dayType && t.is_active
        );

        if (!existing || existing.length === 0) {
          // progress が無ければ新規生成（リセット）
          const insertRows = validTemplates.map((t) => ({
            user_id: userId,
            template_id: t.id,
            adjusted_date: today,
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
              .eq("adjusted_date", today)
              .in("template_id", toDelete);
          }

          // 新しい todoがあれば、progress に追加
          const toAdd = validTemplates.filter(
            (t) => !existingIds.includes(t.id)
          );
          if (toAdd.length > 0) {
            const insertRows = toAdd.map((t) => ({
              user_id: userId,
              template_id: t.id,
              adjusted_date: today,
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
        .eq("adjusted_date", today)
        .order("updated_at", { ascending: true });

      if (error) throw error;

      // title をフラット化
      const normalized = (data || []).map((d) => ({
        ...d,
        title: d.todo_templates?.title ?? "",
      }));

      setTodos(normalized);
    } catch (err) {
      console.error("fetchTodos error:", err);
      setTodos([]);
    } finally {
      setLoading(false);
    }
  };

  // todo完了切替
  const toggleTodo = async (todo: any, rolloverHour: number) => {
    if (!user?.id) return;
    try {
      console.log("toggle rollover:", rolloverHour);

      //今日の日付を取得(rollover基準)
      const adjustedDate = getAdjustedDate(dayRolloverHour); //日付を決定

      const newDone = !todo.is_done;

      // progress 更新
      const { error: progressError } = await supabase
        .from("todo_progress")
        .update({ is_done: newDone, done_at: newDone ? new Date() : null })
        .eq("id", todo.id);

      if (progressError) throw progressError;

      if (newDone) {
        // 完了 → 今日の日付でupsert
        const { error: recordError } = await supabase
          .from("todo_records")
          .upsert(
            [
              {
                user_id: user.id,
                template_id: todo.template_id,
                is_done: newDone,
                title: todo.todo_templates.title,
                date: adjustedDate,
              },
            ],
            { onConflict: "user_id,template_id,date" }
          );

        if (recordError) throw recordError;
      } else {
        // ❌ 取り消し → その日の records を削除
        const { error: deleteError } = await supabase
          .from("todo_records")
          .delete()
          .eq("user_id", user.id)
          .eq("template_id", todo.template_id)
          .eq("date", adjustedDate);

        if (deleteError) throw deleteError;
      }

      await fetchTodos(user.id);
    } catch (err) {
      console.error("toggleTodo error:", err);
    }
  };

  // todo 作成
  const handleSubmit = async () => {
    if (!user?.id) {
      alert("ログインしてください");
      return;
    }
    setLoading(true);
    try {
      // 1. template 作成
      const { data: templateData, error: templateError } = await supabase
        .from("todo_templates")
        .insert([
          {
            user_id: user.id,
            title,
            repeat_type: repeatType,
            repeat_detail:
              repeatType === "weekdays"
                ? { days: ["mon", "tue", "wed", "thu", "fri"] }
                : { days: ["sat", "sun"] },
            is_active: true,
          },
        ])
        .select()
        .single();

      if (templateError) throw templateError;

      // 2. 今日に該当するなら progress も作成
      if (repeatType === getDayType()) {
        const today = new Date().toISOString().slice(0, 10);

        const { error: progressError } = await supabase
          .from("todo_progress")
          .insert([
            {
              template_id: templateData.id,
              user_id: user.id,
              adjusted_date: today,
              is_done: false,
            },
          ]);

        if (progressError) throw progressError;
      }
      await fetchTodos(user.id);

      setTitle("");
      setRepeatType("weekdays");
      setOpen(false);
    } catch (err: any) {
      console.error("handleSubmit error:", err);
      alert("エラー: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 削除（is_active=false）
  const handleDelete = async (id: number, templateId: number | null) => {
    if (!user?.id) return;
    if (!confirm("本当に削除しますか？")) return;
    try {
      if (templateId) {
        await supabase
          .from("todo_templates")
          .update({
            is_active: false,
            deactivated_at: new Date().toISOString().slice(0, 10),
          })
          .eq("id", templateId);

        // progress を削除
        await supabase
          .from("todo_progress")
          .delete()
          .eq("user_id", user.id)
          .eq("template_id", templateId);
      }
      await fetchTodos(user.id);
    } catch (err) {
      console.error("delete error:", err);
    }
  };

  // todo編集
  const handleUpdate = async () => {
    if (!user?.id || !editTodo) return;
    try {
      await supabase
        .from("todo_records")
        .update({ title: editTitle })
        .eq("id", editTodo.id);
      if (editTodo.template_id) {
        await supabase
          .from("todo_templates")
          .update({ title: editTitle })
          .eq("id", editTodo.template_id);
      }
      await fetchTodos(user.id);
      setEditTodo(null);
      setEditTitle("");
    } catch (err) {
      console.error("update error:", err);
      alert("更新に失敗しました");
    }
  };

  //weekend用Todo取得
  const fetchWeekendTodos = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("todo_templates")
        .select("*")
        .eq("user_id", userId)
        .eq("repeat_type", "weekend")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setWeekendTodos(data || []);
    } catch (err) {
      console.error("fetchWeekendTodos error:", err);
      setWeekendTodos([]);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-2xl">
        {/* カウントダウン */}
        <div className="mb-8 p-6 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg shadow text-center">
          <p className="text-sm text-gray-600">試験まで</p>
          <p className="text-3xl font-bold text-yellow-700">{countdown} 日</p>
          <p className="text-sm text-gray-500 mt-1">
            {examDate ? examDate.toLocaleDateString("ja-JP") : "未設定"}
          </p>
        </div>

        {/* 学習統計まとめ */}
        <Dialog>
          <DialogTrigger asChild>
            <button className="w-full p-6 bg-gradient-to-r from-blue-100 to-green-100 rounded-lg shadow hover:shadow-md transition text-center">
              <p className="text-lg font-semibold">学習統計まとめ</p>
              <div className="flex justify-center gap-6 mt-2">
                <div>
                  <p className="text-sm text-gray-600">今週の累計</p>
                  <p className="text-xl font-bold">
                    {studyStats ? studyStats.weekly_hours.toFixed(1) : 0} h
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">連続日数</p>
                  <p className="text-xl font-bold">
                    {studyStats?.streak_days ?? 0} 日
                  </p>
                </div>
              </div>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>学習データ詳細</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>
                📅{" "}
                <span className="font-bold">
                  {studyStats?.streak_days ?? 0}
                </span>{" "}
                日連続で学習中
              </p>
              <p>
                ⏳ 今週の累計学習時間:{" "}
                <span className="font-bold">
                  {" "}
                  {studyStats ? studyStats.weekly_hours.toFixed(1) : 0} h
                </span>
              </p>
              <p>
                ✅ 完了したタスク数:{" "}
                <span className="font-bold">
                  {" "}
                  {studyStats?.total_completed ?? 0}
                </span>
              </p>
              <p>
                🏫 平日勉強時間累計:{" "}
                <span className="font-bold">
                  {" "}
                  {studyStats ? studyStats.weekday_minutes.toFixed(1) : 0} h
                </span>
              </p>
              <p>
                🎉 休日勉強時間累計:{" "}
                <span className="font-bold">
                  {studyStats ? studyStats.weekend_minutes.toFixed(1) : 0} h
                </span>
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Todo一覧 */}
        {loading ? (
          <p className="text-gray-500">読み込み中...</p>
        ) : todos.length === 0 ? (
          <p className="text-gray-500 text-center">Todoがありません</p>
        ) : (
          <ul className="space-y-3">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className={`flex items-center gap-3 p-4 rounded-md shadow-sm cursor-pointer transition ${
                  todo.is_done
                    ? "bg-green-50 line-through text-gray-500"
                    : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={todo.is_done}
                    readOnly
                    onClick={() => toggleTodo(todo)}
                    className="w-5 h-5 cursor-pointer"
                  />
                  <span>{todo.title}</span>
                </div>

                {/* 編集・削除アイコン */}
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditTodo(todo);
                      setEditTitle(todo.title);
                    }}
                  >
                    <Pencil size={16} />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDelete(todo.id, todo.template_id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Todo追加モーダル */}
        <Dialog open={open} onOpenChange={(next) => setOpen(next)}>
          <DialogTrigger asChild>
            <Button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white mt-6">
              Todoを追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Todoを追加</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="例: 問題集2ページやる"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Select
                value={repeatType}
                onValueChange={(v) => setRepeatType(v as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="繰り返しタイプを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekdays">平日</SelectItem>
                  <SelectItem value="weekend">休日</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "保存中..." : "保存する"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Todo編集モーダル */}
        <Dialog open={!!editTodo} onOpenChange={() => setEditTodo(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Todoを編集</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <Button onClick={handleUpdate}>更新する</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* リンク */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
          {/* 休日学習プラン モーダル */}
          <Dialog>
            <DialogTrigger asChild>
              <Button className="inline-block bg-green-500 text-white px-4 py-1 rounded-lg shadow hover:bg-green-600 transition text-center">
                {weekend ? "平日学習プランへ" : "休日学習プランへ"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {weekend ? "平日学習プラン" : "休日学習プラン"}
                </DialogTitle>{" "}
              </DialogHeader>
              {weekend ? (
                // 👉 休日なので「平日プラン」を表示
                weekdayTodos.length === 0 ? (
                  <p className="text-gray-500">平日用のTodoがありません</p>
                ) : (
                  <ul className="space-y-2">
                    {weekdayTodos.map((t) => (
                      <li
                        key={t.id}
                        className="p-3 bg-gray-50 rounded shadow-sm flex justify-between"
                      >
                        <span>{t.title}</span>
                      </li>
                    ))}
                  </ul>
                )
              ) : // 👉 平日なので「休日プラン」を表示
              weekendTodos.length === 0 ? (
                <p className="text-gray-500">休日用のTodoがありません</p>
              ) : (
                <ul className="space-y-2">
                  {weekendTodos.map((t) => (
                    <li
                      key={t.id}
                      className="p-3 bg-gray-50 rounded shadow-sm flex justify-between"
                    >
                      <span>{t.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </DialogContent>
          </Dialog>

          {/* ログインページ */}
          {!user && (
            <Link
              href="/auth/login"
              className="inline-block bg-gray-500 text-white px-4 py-2 rounded-lg shadow hover:bg-gray-600 transition text-center"
            >
              ログイン
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
