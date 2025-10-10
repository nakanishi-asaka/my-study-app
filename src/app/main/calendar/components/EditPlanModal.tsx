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
import { useState } from "react";
import { format } from "date-fns";
import { Plan } from "@/types/plan";

interface EditPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan; // 親から受け取る
  setPlan: React.Dispatch<React.SetStateAction<Plan>>;
  onSave: () => Promise<void>; // savePlan 呼び出し用
  onDelete: () => Promise<void>; // handleDeletePlan 呼び出し用
  planLoading: boolean;
}

export function EditPlanModal({
  open,
  onOpenChange,
  plan,
  setPlan,
  onSave,
  onDelete,
  planLoading,
}: EditPlanModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>予定を編集</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            value={plan.title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPlan((prev) => ({ ...prev, title: e.target.value }))
            }
          />
          <Input
            type="date"
            value={format(new Date(plan.start), "yyyy-MM-dd")}
            onChange={(e) =>
              setPlan((prev) => ({
                ...prev,
                start: new Date(e.target.value), //string → Date に変換
              }))
            }
          />
          <Input
            type="date"
            value={format(new Date(plan.end), "yyyy-MM-dd")}
            onChange={(e) =>
              setPlan((prev) => ({
                ...prev,
                end: new Date(e.target.value), // ✅ string → Date に変換
              }))
            }
          />

          {/* 色選択 */}
          <Select
            value={plan.color}
            onValueChange={(v) => setPlan((prev) => ({ ...prev, color: v }))}
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
              <p className="text-red-600 font-semibold">本当に削除しますか？</p>
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setConfirmDelete(false)}
                >
                  キャンセル
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onDelete();
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

              <Button onClick={onSave} disabled={planLoading}>
                {planLoading ? "保存中..." : "保存"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
