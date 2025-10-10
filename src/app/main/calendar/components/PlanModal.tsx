import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCalendarControls } from "../hooks/useCalendarControls";

interface PlanModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: any;
  onReload?: () => void; // 保存後にリロードなどをしたいとき
}

export function PlanModal({
  open,
  onOpenChange,
  user,
  onReload,
}: PlanModalProps) {
  const { plan, setPlan, planLoading, savePlan, closeNewPlanModal } =
    useCalendarControls(user);

  const handleSave = async () => {
    await savePlan(); // DB登録
    await onReload?.(); // 親をリロード
    onOpenChange(false); // モーダル閉じる（親側state更新）
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新しい予定を追加</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="タイトル"
            value={plan.title}
            onChange={(e) => setPlan({ ...plan, title: e.target.value })}
          />
          <Input
            type="date"
            value={
              typeof plan.start === "string"
                ? plan.start
                : plan.start.toISOString().split("T")[0]
            }
            onChange={(e) =>
              setPlan({ ...plan, start: new Date(e.target.value) })
            }
          />
          <Input
            type="date"
            value={
              typeof plan.end === "string"
                ? plan.end
                : plan.end.toISOString().split("T")[0]
            }
            onChange={(e) =>
              setPlan({ ...plan, end: new Date(e.target.value) })
            }
          />
          <Select
            value={plan.color}
            onValueChange={(v) => setPlan({ ...plan, color: v })}
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
            <Button
              variant="outline"
              onClick={() => {
                closeNewPlanModal();
                onOpenChange(false);
              }}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSave}
              className="bg-orange-500"
              disabled={planLoading}
            >
              {planLoading ? "追加中..." : "追加"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
