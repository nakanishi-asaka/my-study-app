"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import {
  addDays,
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  parseISO,
  differenceInCalendarDays,
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
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  //今日の予定表示用
  const today = new Date();
  const todayKey = format(today, "yyyy-MM-dd");

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

  // ✅ 今日の予定を抽出(Dateに変換して比較)
  const toDateOnly = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const todayOnly = toDateOnly(new Date());

  const todaysPlans = studyPlans.filter((plan) => {
    const start = toDateOnly(new Date(plan.start)); // ← string → Date
    const end = toDateOnly(new Date(plan.end));
    return start <= todayOnly && end >= todayOnly;
  });

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
        {/* ヘッダー */}
        <div className="flex justify-between items-end mb-3">
          {/* 左側: タイトル + 今日の予定 */}
          <div className="flex flex-col gap-2 mr-3">
            <h1 className="text-2xl font-bold">学習カレンダー</h1>
            {todaysPlans.length > 0 && (
              <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                <p className="font-semibold text-blue-700">今日の予定：</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {todaysPlans.map((plan) => {
                    const days =
                      differenceInCalendarDays(today, plan.start) + 1;
                    return (
                      <span
                        key={plan.id}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-semibold"
                      >
                        {plan.title}（{days}日目）
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 右側: 入力フォームと予定追加ボタン */}
          <div className="flex flex-col sm:flex-row items-end gap-4">
            {/* 勉強時間入力フォーム */}
            <div className="flex flex-col gap-2 border p-4  rounded-lg w-full sm:w-auto">
              <p className="text-sm font-semibold text-gray-700">
                🕐今日の学習時間を入力
              </p>
              <div className="flex gap-3 items-center">
                <Select
                  value={hours.toString()}
                  onValueChange={(v) => setHours(Number(v))}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="時間" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 13 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i} 時間
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={minutes.toString()}
                  onValueChange={(v) => setMinutes(Number(v))}
                >
                  <SelectTrigger className="w-28">
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
                  className="bg-green-500 hover:bg-green-600 px-6 py-3 text-base"
                >
                  保存
                </Button>
              </div>
            </div>

            {/* 予定追加ボタン */}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full bg-orange-500 hover:bg-orange-600 px-6 py-3 text-base">
                  <Plus size={20} className="mr-1" />
                  予定追加
                </Button>
              </DialogTrigger>
              {/* ...モーダルの中身はそのまま... */}
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

          {/* 編集モーダル */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>予定を編集</DialogTitle>
              </DialogHeader>
              {selectedPlan && (
                <div className="space-y-3">
                  <Input
                    value={selectedPlan.title}
                    onChange={(e) =>
                      setSelectedPlan({
                        ...selectedPlan,
                        title: e.target.value,
                      })
                    }
                  />
                  <Input
                    type="date"
                    value={format(selectedPlan.start, "yyyy-MM-dd")}
                    onChange={(e) =>
                      setSelectedPlan({
                        ...selectedPlan,
                        start: new Date(e.target.value),
                      })
                    }
                  />
                  <Input
                    type="date"
                    value={format(selectedPlan.end, "yyyy-MM-dd")}
                    onChange={(e) =>
                      setSelectedPlan({
                        ...selectedPlan,
                        end: new Date(e.target.value),
                      })
                    }
                  />

                  {/* 色選択 */}
                  <Select
                    value={selectedPlan.color}
                    onValueChange={(v) =>
                      setSelectedPlan({ ...selectedPlan, color: v })
                    }
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

                  {/* 削除確認用 state */}
                  {confirmDelete ? (
                    <div className="space-y-3">
                      <p className="text-red-600 font-semibold">
                        本当に削除しますか？
                      </p>
                      <div className="flex justify-between">
                        <Button
                          variant="outline"
                          onClick={() => setConfirmDelete(false)}
                        >
                          キャンセル
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={async () => {
                            const { error } = await supabase
                              .from("plans")
                              .delete()
                              .eq("id", selectedPlan.id)
                              .eq("user_id", user.id);

                            if (error) {
                              console.error("削除失敗:", error.message);
                              return;
                            }

                            setStudyPlans((prev) =>
                              prev.filter((p) => p.id !== selectedPlan.id)
                            );
                            setEditOpen(false);
                            setConfirmDelete(false);
                          }}
                        >
                          削除する
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between mt-4">
                      <Button
                        variant="destructive"
                        onClick={() => setConfirmDelete(true)}
                      >
                        削除
                      </Button>
                      <Button
                        onClick={async () => {
                          const { error } = await supabase
                            .from("plans")
                            .update({
                              title: selectedPlan.title,
                              start_date: format(
                                selectedPlan.start,
                                "yyyy-MM-dd"
                              ),
                              end_date: format(selectedPlan.end, "yyyy-MM-dd"),
                              color: selectedPlan.color
                                .replace("bg-", "")
                                .replace("-400", ""),
                            })
                            .eq("id", selectedPlan.id)
                            .eq("user_id", user.id);

                          if (error) {
                            console.error("更新失敗:", error.message);
                            return;
                          }

                          setStudyPlans((prev) =>
                            prev.map((p) =>
                              p.id === selectedPlan.id ? selectedPlan : p
                            )
                          );
                          setEditOpen(false);
                        }}
                      >
                        保存
                      </Button>
                    </div>
                  )}
                </div>
              )}
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

                  const isToday =
                    format(day, "yyyy-MM-dd") ===
                    format(new Date(), "yyyy-MM-dd");

                  return (
                    <div
                      key={day.toISOString()}
                      className={`h-32 border rounded-lg p-1 text-xs flex flex-col justify-between relative
         ${
           isToday
             ? "bg-blue-100 border-blue-300" // 今日 → セル全体の背景色
             : day.getMonth() === month.getMonth()
             ? "bg-gray-50"
             : "bg-gray-100 text-gray-400"
         }
  `}
                    >
                      {/* 上部: 日付と時間 */}
                      <div>
                        <div className="flex justify-between items-start">
                          <span
                            className={`${
                              isToday
                                ? "text-base font-bold text-blue-700"
                                : "font-semibold"
                            }`}
                          >
                            {format(day, "d")}
                          </span>
                          {dailyStudy[key] && (
                            <span className="text-green-600 font-medium text-[15px]">
                              {Math.floor(dailyStudy[key] / 60)}h{" "}
                              {dailyStudy[key] % 60}m
                            </span>
                          )}
                        </div>

                        {/* ノートアイコン */}
                        {titles?.length > 0 && (
                          <button
                            onClick={() =>
                              setSelectedNote(selectedNote === key ? null : key)
                            }
                            className="mt-1 text-gray-500 hover:text-gray-800 self-start z-30 relative"
                          >
                            <BookOpen size={20} />
                          </button>
                        )}
                      </div>

                      {/* 下部: バーを差し込むスペース */}
                      <div className="relative h-6 w-full"></div>
                    </div>
                  );
                })}
              </div>

              {/* バーをまとめて週全体で表示 */}
              <div className="absolute bottom-1 inset-x-0 grid grid-cols-7 gap-1 z-20 pointer-events-none">
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
                      onClick={() => {
                        setSelectedPlan(plan);
                        setEditOpen(true);
                      }}
                      className={`${plan.color} bg-opacity-60 h-5 rounded-md text-xs text-white flex items-center px-1 cursor-pointer pointer-events-auto`}
                      style={{
                        gridColumnStart: startIndex + 1,
                        gridColumnEnd: endIndex + 2,
                        marginTop: `${pi * 2}px`,
                      }}
                    >
                      {startIndex === 0 ||
                      format(plan.start, "yyyy-MM-dd") ===
                        format(barStart, "yyyy-MM-dd")
                        ? plan.title
                        : ""}
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
