"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  addDays,
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  parseISO,
} from "date-fns";
import { BookOpen, Plus } from "lucide-react";

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

export default function CalendarWithPlansAndNotes() {
  const [user, setUser] = useState<any>(null);
  const [studyPlans, setStudyPlans] = useState<any[]>([]);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [dailyRecords, setDailyRecords] = useState<Record<string, string[]>>(
    {}
  );

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // モーダル管理
  const [open, setOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({
    title: "",
    start: "",
    end: "",
    color: "bg-purple-400",
  });

  const month = new Date(2025, 8); // 2025年9月
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  // 全日リスト
  const days: Date[] = [];
  let current = calendarStart;
  while (current <= calendarEnd) {
    days.push(current);
    current = addDays(current, 1);
  }

  // 週ごとに分割
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // ✅ 学習時間マッピング用 state
  const [dailyStudy, setDailyStudy] = useState<Record<string, number>>({});

  // ✅ セッション確認 & ユーザー設定
  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error("getUser error:", error);

      if (data?.user) {
        console.log("ログイン済み:", data.user);
        setUser(data.user);
      } else {
        console.warn("未ログイン状態");
      }
    };
    init();

    // セッション変更を監視
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

    return () => subscription.unsubscribe();
  }, []);

  // ✅ Supabaseから予定を取得
  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase.from("plans").select("*");
      if (error) {
        console.error("fetch error:", error);
      } else if (data) {
        setStudyPlans(
          data.map((p) => ({
            id: p.id,
            title: p.title,
            start: parseISO(p.start_date),
            end: parseISO(p.end_date),
            color: `bg-${p.color}-400`,
          }))
        );
      }
    };
    fetchPlans();
  }, []);

  // ✅ Supabaseから日ごとに学習時間を集計して取得
  useEffect(() => {
    const fetchStudySessions = async () => {
      const { data, error } = await supabase
        .from("study_sessions")
        .select("study_date, study_minutes");

      if (error) {
        console.error("fetch error:", error);
        return;
      }

      // 日ごとに合計
      const totals: Record<string, number> = {};
      data.forEach((s: any) => {
        totals[s.study_date] = (totals[s.study_date] || 0) + s.study_minutes;
      });
      setDailyStudy(totals);
    };

    fetchStudySessions();
  }, []);

  // ✅ study_records を取得
  useEffect(() => {
    const fetchRecords = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("ログインユーザーなし");
        return;
      }

      const { data, error } = await supabase
        .from("study_records")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        console.error("データ取得失敗:", error);
      } else {
        console.log("取得データ:", data);
      }
      // 日付ごとにグルーピング
      const grouped: Record<string, string[]> = {};
      data.forEach((rec: any) => {
        const day = format(new Date(rec.created_at), "yyyy-MM-dd");
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push(rec.title);
      });

      setDailyRecords(grouped);
    };

    fetchRecords();
  }, []);

  // ✅ 予定追加
  const handleAddPlan = async () => {
    if (!user) {
      alert("ログインしてください");
      return;
    }
    if (!newPlan.title || !newPlan.start || !newPlan.end) return;

    const { data, error } = await supabase
      .from("plans")
      .insert([
        {
          user_id: user.id, // ✅ ログインユーザーを利用
          title: newPlan.title,
          start_date: newPlan.start,
          end_date: newPlan.end,
          color: newPlan.color.replace("bg-", "").replace("-400", ""),
        },
      ])
      .select();

    if (error) {
      console.error("Insert error:", error);
      alert("保存に失敗しました");
      return;
    }

    if (data) {
      setStudyPlans([
        ...studyPlans,
        {
          id: data[0].id,
          title: data[0].title,
          start: parseISO(data[0].start_date),
          end: parseISO(data[0].end_date),
          color: `bg-${data[0].color}-400`,
        },
      ]);
    }

    setNewPlan({ title: "", start: "", end: "", color: "bg-purple-400" });
    setOpen(false);
  };

  //study_sessionに学習時間を追加(日ごと合計を表示するので、1日に複数回ok)
  const handleSaveStudyTime = async () => {
    const totalMinutes = hours * 60 + minutes;
    if (totalMinutes === 0) return;

    const today = format(new Date(), "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("study_sessions")
      .insert([
        {
          user_id: user.id,
          study_date: today,
          study_minutes: totalMinutes,
        },
      ])
      .select();

    if (error) {
      console.error("Insert error:", error);
      alert("保存失敗しました");
      return;
    }

    // state 更新
    setDailyStudy((prev) => ({
      ...prev,
      [today]: (prev[today] || 0) + totalMinutes,
    }));

    alert(`${hours}時間${minutes}分を保存しました！`);
    setHours(0);
    setMinutes(0);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow p-6 relative">
        {/* ✅ ログイン状況の表示 */}
        <div className="mb-4 text-sm text-gray-600">
          {user ? `ログイン中: ${user.email}` : "未ログイン"}
        </div>

        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-center">学習カレンダー</h1>

          {/* 勉強時間入力フォーム */}
          <div className="flex gap-2 items-center border p-2 rounded-lg">
            <Select
              value={hours.toString()}
              onValueChange={(v) => setHours(Number(v))}
            >
              <SelectTrigger className="w-20">
                <SelectValue placeholder="時間" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 13 }, (_, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {i} 時
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={minutes.toString()}
              onValueChange={(v) => setMinutes(Number(v))}
            >
              <SelectTrigger className="w-20">
                <SelectValue placeholder="分" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                  <SelectItem key={m} value={m.toString()}>
                    {m} 分
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleSaveStudyTime}
              className="bg-green-500 hover:bg-green-600"
            >
              保存
            </Button>
          </div>

          {/* 予定作成ボタン */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-orange-500 hover:bg-orange-600">
                <Plus size={20} className="mr-1" />
                予定追加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新しい予定を追加</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="タイトル"
                  value={newPlan.title}
                  onChange={(e) =>
                    setNewPlan({ ...newPlan, title: e.target.value })
                  }
                />
                <Input
                  type="date"
                  value={newPlan.start}
                  onChange={(e) =>
                    setNewPlan({ ...newPlan, start: e.target.value })
                  }
                />
                <Input
                  type="date"
                  value={newPlan.end}
                  onChange={(e) =>
                    setNewPlan({ ...newPlan, end: e.target.value })
                  }
                />
                <Select
                  value={newPlan.color}
                  onValueChange={(v) => setNewPlan({ ...newPlan, color: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="色を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bg-purple-400">紫</SelectItem>
                    <SelectItem value="bg-blue-400">青</SelectItem>
                    <SelectItem value="bg-green-400">緑</SelectItem>
                    <SelectItem value="bg-red-400">赤</SelectItem>
                    <SelectItem value="bg-yellow-400">黄</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    キャンセル
                  </Button>
                  <Button onClick={handleAddPlan} className="bg-orange-500">
                    追加
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 text-center font-semibold text-gray-600 mb-2">
          {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* 各週 */}
        {weeks.map((week, wi) => {
          const weekStart = week[0];
          const weekEnd = week[6];

          const weekPlans = studyPlans.filter(
            (plan) => plan.start <= weekEnd && plan.end >= weekStart
          );

          return (
            <div key={wi} className="relative mb-2">
              {/* 日付セル */}
              <div className="grid grid-cols-7 gap-1 relative z-10">
                {week.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const titles = dailyRecords[key] || [];

                  return (
                    <div
                      key={day.toISOString()}
                      className={`h-24 border rounded-lg p-1 text-xs relative flex flex-col
                        ${
                          day.getMonth() === month.getMonth()
                            ? "bg-gray-50"
                            : "bg-gray-100 text-gray-400"
                        }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-semibold">
                          {format(day, "d")}
                        </span>
                        {dailyStudy[key] && (
                          <span className="text-green-600 font-medium text-[15px]">
                            {Math.floor(dailyStudy[key] / 60)}h{" "}
                            {dailyStudy[key] % 60}m
                          </span>
                        )}
                      </div>

                      {titles?.length > 0 && (
                        <button
                          onClick={() =>
                            setSelectedNote(selectedNote === key ? null : key)
                          }
                          className="mt-1 text-gray-500 hover:text-gray-800 self-start"
                        >
                          <BookOpen size={20} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* バーレイヤー */}
              <div className="grid grid-cols-7 gap-1 absolute inset-0 z-20 pointer-events-none">
                {weekPlans.map((plan, pi) => {
                  const barStart =
                    plan.start > weekStart ? plan.start : weekStart;
                  const barEnd = plan.end < weekEnd ? plan.end : weekEnd;

                  const startIndex = week.findIndex(
                    (d) =>
                      format(d, "yyyy-MM-dd") === format(barStart, "yyyy-MM-dd")
                  );
                  const endIndex = week.findIndex(
                    (d) =>
                      format(d, "yyyy-MM-dd") === format(barEnd, "yyyy-MM-dd")
                  );

                  return (
                    <div
                      key={pi}
                      className={`${plan.color} bg-opacity-60 h-6 rounded-md text-xs text-white flex items-center px-1`}
                      style={{
                        gridColumnStart: startIndex + 1,
                        gridColumnEnd: endIndex + 2,
                        alignSelf: "end",
                        marginBottom: "2px",
                      }}
                    >
                      {plan.start >= weekStart ? plan.title : ""}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* ノート概要 */}
        {selectedNote && (
          <div className="mt-3 p-3 bg-gray-50 border rounded">
            <h2 className="font-bold mb-2">{selectedNote} の記録一覧</h2>
            <ul className="list-disc list-inside text-sm space-y-1">
              {dailyRecords[selectedNote]?.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
