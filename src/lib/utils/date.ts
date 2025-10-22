//getAdjustedDate, getDayTypeFromAdjustedDate ,getTodayInfoをここに移動

export type DayType = "weekdays" | "weekend";

export type TodayInfo = {
  adjustedDate: Date;
  formattedDate: string;
  dayType: DayType;
};

//ロールオーバー時刻を考慮して「今日」の情報をまとめて返す共通関数
export function getTodayInfo(rolloverHour: number): TodayInfo {
  const adjustedDate = getAdjustedDateObj(rolloverHour); //rollover考慮した今日は何日？
  const formattedDate = formatDateJST(adjustedDate);
  const dayType = getDayTypeFromAdjustedDate(adjustedDate); //rollover考慮した日付が平日or休日どちらか？
  return { adjustedDate, formattedDate, dayType };
}

// getAdjustedDate を Date オブジェクトで返す
export function getAdjustedDateObj(dayRolloverHour: number): Date {
  const now = new Date();
  const rollover = typeof dayRolloverHour === "number" ? dayRolloverHour : 3;

  // JST時間を計算 (+9h)
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  // 🔍 JST時間でrollover判定
  const hourJST = jstNow.getHours();

  // rollover 時刻前なら「前日」を返す
  const adjustedDate = new Date(jstNow);
  if (hourJST < rollover) {
    jstNow.setDate(jstNow.getDate() - 1);
  }

  //JSTの0時を作る
  adjustedDate.setHours(0, 0, 0, 0);

  return adjustedDate; //jst基準のDateオブジェクト
}

// JST基準で日付文字列を返す
export function formatDateJST(date: Date) {
  return `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
}

//平日/休日判定
export function getDayTypeFromAdjustedDate(date: Date): "weekdays" | "weekend" {
  const day = date.getDay(); // 0=日, 6=土
  return day === 0 || day === 6 ? "weekend" : "weekdays";
}
