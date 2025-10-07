"use client";

import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Todo } from "../../../types/todo";

type TodoItemProps = {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string, templateId: string | null) => void;
};

export default function TodoItem({
  todo,
  onToggle,
  onEdit,
  onDelete,
}: TodoItemProps) {
  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    onDelete(todo.id, todo.template_id);
    setOpen(false);
  };
  return (
    <li
      className={`flex items-center gap-3 p-4 rounded-md shadow-sm cursor-pointer transition ${
        todo.is_done
          ? "bg-green-50 line-through text-gray-500"
          : "bg-gray-50 hover:bg-gray-100"
      }`}
    >
      {/* チェックボックス＆タイトル*/}

      <div className="flex items-center gap-3 flex-1">
        <input
          type="checkbox"
          checked={todo.is_done}
          readOnly
          onChange={() => onToggle(todo)}
          className="w-5 h-5 cursor-pointer"
        />
        <span>{todo.title}</span>
      </div>
      <div className="flex gap-2">
        {/* 編集ボタン：完了済みなら無効化 */}
        <Button
          size="icon"
          variant="outline"
          disabled={todo.is_done}
          onClick={(e) => {
            e.stopPropagation();
            if (!todo.is_done) onEdit(todo);
          }}
        >
          <Pencil className="w-4 h-4" />
        </Button>
        {/* 削除ボタン：完了済みなら確認ダイアログを表示 */}

        {todo.is_done ? (
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <Button
                size="icon"
                variant="destructive"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>完了済みタスクの削除</AlertDialogTitle>
                <AlertDialogDescription>
                  このタスクは完了済みです。削除しても履歴は残りますが、
                  一覧からは非表示になります。
                  <br />
                  本当に削除しますか？
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  削除する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button
            size="icon"
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(todo.id, todo.template_id ?? null);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </li>
  );
}
