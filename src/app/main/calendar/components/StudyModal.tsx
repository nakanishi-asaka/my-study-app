import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function StudyTimeModal({
  open,
  onOpenChange,
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
  onSave,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hours: number;
  minutes: number;
  onHoursChange: (v: number) => void;
  onMinutesChange: (v: number) => void;
  onSave: () => void;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>🕐 今日の学習時間を入力</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4 mt-2">
          <Select
            value={hours.toString()}
            onValueChange={(v) => onHoursChange(Number(v))}
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
            onValueChange={(v) => onMinutesChange(Number(v))}
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
        </div>

        <Button
          onClick={() => {
            onSave();
          }}
          disabled={loading} // 保存中は無効化
          className="bg-green-500 hover:bg-green-600 px-6 py-3 text-base"
        >
          {loading ? "保存中..." : "保存"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
