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

import TodoList from "../components/TodoList";
import TodoModal from "../components/TodoModal";
import { fetchTodos, rolloverProgress, toggleTodo } from "@/lib/data";
import {
  getAdjustedDateObj,
  getDayTypeFromAdjustedDate,
} from "../../../lib/utils/date";
import { Todo } from "@/types/todo";

//学習統計の型
type StudyStats = {
  weekly_hours: number;
  streak_days: number;
  total_completed: number;
  weekday_minutes: number;
  weekend_minutes: number;
};

export type DayType = "weekdays" | "weekend";

export type TodayInfo = {
  adjustedDate: Date;
  formattedDate: string;
  dayType: DayType;
};

//試験日カウントダウンの計算
function getCountdown(targetDate: Date) {
  const today = new Date();
  const diff = targetDate.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
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
  const [dayRolloverHour, setDayRolloverHour] = useState<number>(3);

  //モーダルでtodo表示用
  const [weekdayTodos, setWeekdayTodos] = useState<any[]>([]);
  const [weekendTodos, setWeekendTodos] = useState<any[]>([]);

  const [dayType, setDayType] = useState<"weekdays" | "weekend">("weekdays");

  // クライアント側で session を取得してユーザー設定  ＋ fetchtodos実行+ デバッグ
  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("getSession error:", error);
      if (!data?.session) {
        console.warn("未ログイン状態 (getSession)");
      } else {
        console.log("ログイン済みユーザー:", data.session.user);
        setUser(data.session.user);

        //データを受け取ってsetTodosに渡す
        const todos = await fetchTodos(data.session.user.id, dayRolloverHour);
        setTodos(todos);
      }
    };
    init();

    // ✅ セッション変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
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
        .select("exam_date,day_rollover_hour")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("fetchProfile error:", error);
        return;
      }
      if (data?.exam_date) {
        setExamDate(new Date(data.exam_date));
      }
      if (data?.day_rollover_hour != null) {
        setDayRolloverHour(data.day_rollover_hour);
        console.log("✅ ユーザー設定の rolloverHour:", data.day_rollover_hour);
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
        const { data: weekly, error: weeklyError } = await supabase.rpc(
          "get_weekly_summary"
        );
        if (weeklyError) {
          console.error("weekly_summary error:", weeklyError);
        }

        // 累計分
        const { data: total, error: totalError } = await supabase.rpc(
          "get_total_summary"
        );
        if (totalError) {
          console.error("get_total_summary error:", totalError);
        }

        const weeklyData = weekly?.[0];
        const totalData = total?.[0];

        setStudyStats({
          weekly_hours: (weeklyData?.week_total_minutes ?? 0) / 60,
          streak_days: totalData?.current_streak_days ?? 0, // ← ✅ streak 日数を格納
          total_completed: totalData?.total_completed_todos ?? 0,
          weekday_minutes: (totalData?.weekday_minutes ?? 0) / 60,
          weekend_minutes: (totalData?.weekend_minutes ?? 0) / 60,
        });
      } catch (err) {
        console.error("fetchStats error:", err);
      }
    };

    fetchStats();
  }, [user]);

  // dayType の算出を useEffect に移動
  useEffect(() => {
    if (typeof dayRolloverHour !== "number") return;

    const adjustedDate = getAdjustedDateObj(dayRolloverHour);
    const type = getDayTypeFromAdjustedDate(adjustedDate);

    setDayType(type); // ✅ state 更新で再レンダー発生

    console.log(
      "🕒 adjustedDate:",
      adjustedDate.toLocaleString(),
      "dayType:",
      type
    );
  }, [dayRolloverHour]);

  //モーダル表示用のtodo取得
  useEffect(() => {
    if (!dayType || !user) return;

    const fetchTodosForModal = async () => {
      // 🔍 デバッグログ
      console.log("=== modal fetchTodos Debug ===");
      console.log("現在時刻:", new Date().toLocaleString());
      console.log("dayType:", dayType);

      const oppositeType = dayType === "weekend" ? "weekdays" : "weekend";

      const { data, error } = await supabase
        .from("todo_templates")
        .select("*")
        .eq("repeat_type", oppositeType)
        .eq("is_active", true);

      if (error) {
        console.error(error);
        return;
      }

      if (oppositeType === "weekdays") {
        setWeekdayTodos(data || []);
        setWeekendTodos([]);
      } else {
        setWeekendTodos(data || []);
        setWeekdayTodos([]);
      }
      console.log("✅ modal todos fetched:", oppositeType, data);
    };

    fetchTodosForModal();
  }, [dayType, user]);

  //todo完了
  const handleToggle = async (todo: Todo) => {
    setLoading(true);
    await toggleTodo(user, todo, dayRolloverHour);
    const updated = await fetchTodos(user.id, dayRolloverHour);
    setTodos(updated);
    setLoading(false);
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

      const todos = await fetchTodos(user.id, dayRolloverHour);
      setTodos(todos);

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
  const handleDelete = async (id: string, templateId: string | null) => {
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
      }
      const todos = await fetchTodos(user.id, dayRolloverHour);
      setTodos(todos);
    } catch (err) {
      console.error("delete error:", err);
    }
  };

  // todo編集
  const handleUpdate = async () => {
    if (!user?.id || !editTodo) return;
    try {
      await supabase
        .from("todo_templates")
        .update({ title: editTitle })
        .eq("id", editTodo.template_id);

      const todos = await fetchTodos(user.id, dayRolloverHour);
      setTodos(todos);

      setEditTodo(null);
      setEditTitle("");
    } catch (err) {
      console.error("update error:", err);
      alert("更新に失敗しました");
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
        <TodoList
          todos={todos}
          loading={loading}
          onToggle={handleToggle}
          onEdit={(todo) => {
            setEditTodo(todo);
            setEditTitle(todo.title);
          }}
          onDelete={handleDelete}
        />

        {/* Todo追加モーダル */}
        <Dialog open={open} onOpenChange={(next) => setOpen(next)}>
          <DialogTrigger asChild>
            <Button className="w-full bg-sky-500 hover:bg-sky-600 text-white mt-6">
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
          {dayType === "weekend" ? (
            // 👉 休日なので「平日プラン」をモーダルで表示
            <TodoModal
              key={`modal-weekday-${dayType}-${weekdayTodos.length}`} //ボタンラベルが変わらない場合があるのでkeyで強制再生成
              todos={weekdayTodos}
              mode="weekday"
              buttonLabel="平日todoを確認"
            />
          ) : (
            // 👉 平日なので「休日プラン」をモーダルで表示
            <TodoModal
              key={`modal-weekend-${dayType}-${weekendTodos.length}`} //ボタンラベルが変わらない場合があるのでkeyで強制再生成
              todos={weekendTodos}
              mode="weekend"
              buttonLabel="休日todoを確認"
            />
          )}

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
