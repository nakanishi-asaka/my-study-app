//getAdjustedDate, getDayTypeFromAdjustedDate, formatDate をここに移動
// getTodayInfo もここに移動

import { formatDate } from "./format";

export type DayType = "weekdays" | "weekend";

export type TodayInfo = {
  adjustedDate: Date;
  formattedDate: string;
  dayType: DayType;
};

/**
 * ロールオーバー時刻を考慮して「今日」の情報をまとめて返す共通関数
 */
export function getTodayInfo(rolloverHour: number): TodayInfo {
  const adjustedDate = getAdjustedDateObj(rolloverHour);
  const formattedDate = formatDate(adjustedDate);
  const dayType = getDayTypeFromAdjustedDate(adjustedDate);
  return { adjustedDate, formattedDate, dayType };
}

// ユーザーごとの adjusted_date を計算する関数
// getAdjustedDate を Date オブジェクトで返す
export function getAdjustedDateObj(dayRolloverHour: number): Date {
  const now = new Date();
  const rollover = typeof dayRolloverHour === "number" ? dayRolloverHour : 3;

  const adjusted = new Date(now);

  if (now.getHours() < rollover) {
    // rollover 時刻前なら「前日」を返す
    adjusted.setDate(adjusted.getDate() - 1);
  }

  return new Date(
    adjusted.getFullYear(),
    adjusted.getMonth(),
    adjusted.getDate()
  ); // 時刻部分を切り捨て
}

//平日/休日判定
export function getDayTypeFromAdjustedDate(date: Date): "weekdays" | "weekend" {
  const day = date.getDay(); // 0=日, 6=土
  return day === 0 || day === 6 ? "weekend" : "weekdays";
}
