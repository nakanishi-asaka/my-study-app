//カレンダーページの状態管理、制御、db操作関数の呼び出し

import { useState } from "react";
import { insertStudySession } from "../../../../lib/db/study_sessions";
import { deletePlan, upsertPlan } from "../../../../lib/db/plans";

export function useCalendarControls(user: any, onReload?: () => void) {
  // モーダル管理
  const [studyTimeOpen, setStudyTimeOpen] = useState(false);

  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [editPlanOpen, setEditPlanOpen] = useState(false);

  // 学習時間
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [loading, setLoading] = useState(false);

  // 予定フォーム
  const [plan, setPlan] = useState<{
    id: string | null;
    title: string;
    start: Date;
    end: Date;
    color: string;
    mode: "insert" | "update";
  }>({
    id: null,
    title: "",
    start: new Date(),
    end: new Date(),
    color: "bg-purple-400",
    mode: "insert",
  });
  const [planLoading, setPlanLoading] = useState(false);

  // --- モーダル操作 ---
  const openNewPlanModal = () => {
    setPlan({
      id: null,
      title: "",
      start: new Date(),
      end: new Date(),
      color: "bg-purple-400",
      mode: "insert",
    });
    setNewPlanOpen(true);
  };

  const openEditPlanModal = (planData: any) => {
    console.log("📌 openEditPlanModal called with:", planData);
    setPlan({
      id: planData.id,
      title: planData.title ?? "",
      start: new Date(planData.start ?? planData.start_date),
      end: new Date(planData.end ?? planData.end_date),
      color: planData.color?.startsWith("bg-")
        ? planData.color
        : `bg-${planData.color}-400`,
      mode: "update",
    });
    setEditPlanOpen(true);
  };

  const closeNewPlanModal = () => setNewPlanOpen(false);
  const closeEditPlanModal = () => setEditPlanOpen(false);

  const openStudyTimeModal = () => setStudyTimeOpen(true);
  const closeStudyTimeModal = () => setStudyTimeOpen(false);

  // 学習時間を保存(関数はlib→study_session) ---
  const saveStudyTime = async () => {
    const total = hours * 60 + minutes;
    if (!total) return alert("時間を入力してください");
    setLoading(true);

    try {
      const data = await insertStudySession(user.id, total);
      console.log("✅ 学習時間を保存:", data);
      closeStudyTimeModal();
      setHours(0);
      setMinutes(0);

      await onReload?.();
    } catch (error) {
      console.error("学習時間保存エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  //予定をDBに保存
  const savePlan = async () => {
    try {
      console.log("💾 保存直前のplan:", plan);

      setPlanLoading(true);
      const mode = plan.mode;

      //planをそのまま渡す
      await upsertPlan(user.id, plan, mode);

      // モーダル閉じる
      if (plan.mode === "insert") {
        closeNewPlanModal();
      } else if (plan.mode === "update") {
        closeEditPlanModal();
      }

      //フォーム初期化
      setPlan({
        id: null,
        title: "",
        start: new Date(),
        end: new Date(),
        color: "bg-purple-400",
        mode: "insert",
      });
      onReload?.();
    } catch (error) {
      console.error("予定保存エラー:", error);
    } finally {
      setPlanLoading(false);
    }
  };

  // --- 予定削除 ---
  const handleDeletePlan = async () => {
    if (!plan.id) return;
    try {
      await deletePlan(user.id, plan.id);
      closeEditPlanModal();
      setPlan({
        id: null,
        title: "",
        start: new Date(),
        end: new Date(),
        color: "bg-purple-400",
        mode: "insert", //これ合ってる？
      });
      onReload?.();
    } catch (error) {
      console.error("予定削除エラー:", error);
    }
  };

  return {
    // 状態
    studyTimeOpen,
    hours,
    minutes,
    loading,
    plan,
    planLoading,

    // 入力変更用
    setHours,
    setMinutes,
    setPlan,

    // モーダル操作
    newPlanOpen,
    editPlanOpen,
    openNewPlanModal,
    openEditPlanModal,
    closeNewPlanModal,
    closeEditPlanModal,
    openStudyTimeModal,
    closeStudyTimeModal,

    // 保存処理
    saveStudyTime,
    savePlan,

    //削除処理
    handleDeletePlan,
  };
}
