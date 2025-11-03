"use client";

import React, { useState, useEffect } from "react";
import { useMemo } from "react";
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
  startOfDay,
  subMonths,
  addMonths,
  eachWeekOfInterval,
} from "date-fns";
import { BookOpen, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StudyTimeModal } from "./components/StudyModal";
import { PlanModal } from "./components/PlanModal";
import { useCalendarControls } from "./hooks/useCalendarControls";
import { EditPlanModal } from "./components/EditPlanModal";

//追加
const formatDate = (d: Date) => format(d, "yyyy-MM-dd");

export default function CalendarWithPlansAndNotes() {
  const [user, setUser] = useState<any>(null);
  const [studyPlans, setStudyPlans] = useState<any[]>([]);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [dailyRecords, setDailyRecords] = useState<Record<string, string[]>>(
    {}
  );
  const [month, setMonth] = useState(new Date());
  const [dailyStudy, setDailyStudy] = useState<Record<string, number>>({}); // ✅ 学習時間マッピング用 state

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

  // 📅 月を前後に移動
  const handlePrevMonth = () => setMonth(subMonths(month, 1));
  const handleNextMonth = () => setMonth(addMonths(month, 1));

  // ✅ セッション確認 & ユーザー認証
  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => data?.user && setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user || null));
    return () => subscription.unsubscribe();
  }, []);

  // データ取得共通関数
  const fetchTable = async (table: string, eq?: Record<string, any>) => {
    let query = supabase.from(table).select("*");
    if (eq) Object.entries(eq).forEach(([k, v]) => (query = query.eq(k, v)));
    const { data, error } = await query;
    if (error) console.error(`${table} fetch error:`, error);
    return data || [];
  };

  // ✅ Supabaseから予定を取得
  const fetchPlans = async () => {
    const data = await fetchTable("plans");
    setStudyPlans(
      data.map((p) => ({
        id: p.id,
        title: p.title,
        start: parseISO(p.start_date),
        end: parseISO(p.end_date),
        color: `bg-${p.color}-400`,
      }))
    );
  };

  //予定と学習時間を取得
  useEffect(() => {
    fetchPlans();
    fetchStudySessions();
  }, []);

  // ✅ Supabaseから日ごとに学習時間を集計して取得
  useEffect(() => {
    if (!user) return;
    fetchTable("study_records", { user_id: user.id }).then((data) => {
      const grouped: Record<string, string[]> = {};
      data.forEach((rec: any) => {
        const day = formatDate(new Date(rec.created_at));
        (grouped[day] ||= []).push(rec.title);
      });
      setDailyRecords(grouped);
    });
  }, [user]);

  // ✅学習時間： study_records を取得
  const fetchStudySessions = async () => {
    const data = await fetchTable("study_sessions");
    const totals: Record<string, number> = {};
    data.forEach(
      (s: any) =>
        (totals[s.study_date] = (totals[s.study_date] || 0) + s.study_minutes)
    );
    setDailyStudy(totals);
  };

  const onReload = async () => {
    await fetchPlans();
    await fetchStudySessions(); // ← これを追加！
  };

  const {
    newPlanOpen,
    editPlanOpen,
    studyTimeOpen,
    plan,
    hours,
    minutes,
    setHours,
    setMinutes,
    loading,
    planLoading,
    setPlan,
    openEditPlanModal,
    openNewPlanModal,
    openStudyTimeModal,
    closeNewPlanModal,
    closeEditPlanModal,
    closeStudyTimeModal,
    saveStudyTime,
    savePlan,
    handleDeletePlan,
  } = useCalendarControls(user, onReload);

  // --- 今日関連ユーティリティ ---
  const getTodayInfo = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // 時間切り捨て
    const todayStr = format(today, "yyyy-MM-dd");
    return { now, today, todayStr };
  };

  const { now, today, todayStr } = getTodayInfo();

  // ✅ 今日の予定を抽出(Dateに変換して比較)
  const todaysPlans = useMemo(() => {
    return studyPlans.filter(
      (p) =>
        format(p.start, "yyyy-MM-dd") <= todayStr &&
        format(p.end, "yyyy-MM-dd") >= todayStr
    );
  }, [studyPlans, todayStr]);

  // カレンダー週構造
  const weeks = eachWeekOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
  }).map((weekStart) =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  );

  return (
    <div className="p-3 bg-gray-100 min-h-screen">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow px-2 py-3 relative">
        {/* ヘッダー */}
        <div className="flex justify-between items-end mb-3">
          {/* 左側: タイトル + 今日の予定 */}
          <div className="flex flex-col gap-2 mr-3">
            <h1 className="text-2xl font-bold">学習カレンダー</h1>
            {todaysPlans.length > 0 && (
              <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                <p className="font-semibold text-blue-700">今日の予定：</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {todaysPlans.map((p) => {
                    // ✅ start/end はDate型前提
                    const startDate = startOfDay(
                      typeof p.start === "string" ? parseISO(p.start) : p.start
                    );

                    const days = differenceInCalendarDays(today, startDate) + 1;

                    return (
                      <span
                        key={p.id}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-semibold"
                      >
                        {p.title}（{days}日目）
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 右側: 入力フォームと予定追加ボタン */}
          <div className="flex flex-row sm:flex-col gap-4">
            <div className="flex flex-col items-center">
              {/* 学習時間ボタン */}
              <Button
                onClick={openStudyTimeModal}
                className="rounded-full bg-green-500 hover:bg-green-600 p-3 sm:px-6 sm:py-3"
              >
                <Plus size={22} />
                <span className="hidden sm:inline ml-1">学習時間を入力</span>
              </Button>
              <span className="text-xs mt-1 sm:hidden text-gray-600">時間</span>
            </div>

            {/* 予定追加ボタン */}
            <div className="flex flex-col items-center">
              <Button
                onClick={() => openNewPlanModal()}
                className="rounded-full bg-orange-500 hover:bg-orange-600 p-3 sm:px-6 sm:py-3"
              >
                <BookOpen size={22} />
                <span className="hidden sm:inline ml-1">予定追加</span>
              </Button>
              <span className="text-xs mt-1 sm:hidden text-gray-600">予定</span>
            </div>
          </div>

          {/* 学習時間追加モーダル */}
          <StudyTimeModal
            open={studyTimeOpen}
            onOpenChange={closeStudyTimeModal}
            hours={hours}
            minutes={minutes}
            onHoursChange={setHours}
            onMinutesChange={setMinutes}
            onSave={saveStudyTime}
            loading={loading}
          />

          {/* 予定追加モーダル */}
          <PlanModal
            open={newPlanOpen}
            onOpenChange={closeNewPlanModal}
            user={user}
            onReload={fetchPlans}
          />

          {/* 編集モーダル */}
          <EditPlanModal
            open={editPlanOpen}
            onOpenChange={closeEditPlanModal}
            plan={plan}
            setPlan={setPlan}
            onSave={savePlan}
            onDelete={handleDeletePlan}
            planLoading={planLoading}
          />
        </div>

        {/* 📅 月切り替えヘッダー */}
        <div className="flex justify-center items-center gap-4 my-4">
          <Button variant="outline" onClick={handlePrevMonth}>
            ← 前の月
          </Button>
          <h2 className="text-xl font-bold">{format(month, "yyyy年 M月")}</h2>
          <Button variant="outline" onClick={handleNextMonth}>
            次の月 →
          </Button>
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
            <div key={wi} className="relative mb-2 h-32">
              {/* 日付セル */}
              <div className="grid grid-cols-7 gap-1 h-full relative z-10">
                {week.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const titles = dailyRecords[key] || [];
                  const isToday =
                    format(day, "yyyy-MM-dd") ===
                    format(new Date(), "yyyy-MM-dd");

                  return (
                    <div
                      key={day.toISOString()}
                      className={`border rounded-lg p-1 text-xs flex flex-col justify-start relative
                ${
                  isToday
                    ? "bg-blue-100 border-blue-300"
                    : day.getMonth() === month.getMonth()
                    ? "bg-gray-50"
                    : "bg-gray-100 text-gray-400"
                }`}
                    >
                      {/* 上部: 日付と時間 */}
                      <div className="flex justify-between items-start">
                        <span
                          className={
                            isToday
                              ? "text-base font-bold text-blue-700"
                              : "font-semibold"
                          }
                        >
                          {format(day, "d")}
                        </span>
                        {dailyStudy[key] && (
                          <span className="text-green-600 font-medium text-[13px]">
                            {Math.floor(dailyStudy[key] / 60)}h{" "}
                            {dailyStudy[key] % 60}m
                          </span>
                        )}
                      </div>

                      {/* ノートアイコン */}
                      {titles.length > 0 && (
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
                  );
                })}
              </div>

              {/* バー用レイヤー（週全体にまたがる） */}
              <div
                className="absolute bottom-0 left-0 right-0 grid grid-cols-7 gap-1 z-20 pointer-events-none"
                style={{ height: "100%" }}
              >
                {(() => {
                  const barHeight = 16;
                  const barGap = 5;
                  const positionedBars: {
                    plan: any;
                    startIndex: number;
                    endIndex: number;
                    bottomOffset: number;
                  }[] = [];

                  const cellBottomPadding = 6; //セル下端からの余白

                  weekPlans.forEach((plan) => {
                    const barStart = startOfDay(
                      plan.start > weekStart ? plan.start : weekStart
                    );
                    const barEnd = startOfDay(
                      plan.end < weekEnd ? plan.end : weekEnd
                    );

                    const startIndex = week.findIndex(
                      (d) =>
                        format(startOfDay(d), "yyyy-MM-dd") ===
                        format(barStart, "yyyy-MM-dd")
                    );
                    const endIndex = week.findIndex(
                      (d) =>
                        format(startOfDay(d), "yyyy-MM-dd") ===
                        format(barEnd, "yyyy-MM-dd")
                    );

                    // positionedBars 生成部分

                    let offsetLevel = 0; //縦方向の位置決め

                    while (
                      positionedBars.some(
                        (b) =>
                          !(
                            b.endIndex < startIndex || b.startIndex > endIndex
                          ) &&
                          b.bottomOffset ===
                            cellBottomPadding +
                              offsetLevel * (barHeight + barGap)
                      )
                    ) {
                      offsetLevel++;
                    }

                    positionedBars.push({
                      plan,
                      startIndex,
                      endIndex,
                      bottomOffset:
                        cellBottomPadding + offsetLevel * (barHeight + barGap),
                    });
                  });

                  return positionedBars.map(
                    ({ plan, startIndex, endIndex, bottomOffset }, i) => {
                      const isFirstWeekOfPlan = plan.start >= weekStart;
                      return (
                        <div
                          key={i}
                          onClick={() => openEditPlanModal(plan)}
                          className={`${plan.color} bg-opacity-70 h-5 rounded-md text-xs text-white flex items-center px-1 cursor-pointer pointer-events-auto`}
                          style={{
                            gridColumnStart: startIndex + 1,
                            gridColumnEnd: endIndex + 2,
                            position: "absolute",
                            left: 0,
                            right: 0,
                            bottom: `${bottomOffset}px`,
                          }}
                        >
                          {isFirstWeekOfPlan ? plan.title : ""}
                        </div>
                      );
                    }
                  );
                })()}
              </div>
            </div>
          );
        })}

        {/* 📘 ノート表示エリア */}
        {selectedNote && (
          <div className="mt-6 bg-white rounded-lg shadow p-4 max-w-4xl mx-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-2">
              🗓 {selectedNote} のノート
            </h2>

            {dailyRecords[selectedNote]?.length ? (
              <ul className="list-disc list-inside space-y-1">
                {dailyRecords[selectedNote].map((title, idx) => (
                  <li key={idx} className="text-gray-700 text-sm">
                    {title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">ノートがありません。</p>
            )}

            <div className="mt-3 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setSelectedNote(null)}
                className="text-gray-600"
              >
                閉じる
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
