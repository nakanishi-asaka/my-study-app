"use client";

import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

type Todo = {
  id: string;
  title: string;
  is_done: boolean;
  template_id?: string | null;
};

type TodoItemProps = {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string, templateId?: string | null) => void;
};

export default function TodoItem({
  todo,
  onToggle,
  onEdit,
  onDelete,
}: TodoItemProps) {
  return (
    <li
      key={todo.id}
      className={`flex items-center gap-3 p-4 rounded-md shadow-sm cursor-pointer transition ${
        todo.is_done
          ? "bg-green-50 line-through text-gray-500"
          : "bg-gray-50 hover:bg-gray-100"
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        <input
          type="checkbox"
          checked={todo.is_done}
          readOnly
          onClick={() => onToggle(todo)}
          className="w-5 h-5 cursor-pointer"
        />
        <span>{todo.title}</span>
      </div>
      <div className="flex gap-2">
        <Button
          size="icon"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(todo);
          }}
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="destructive"
          onClick={() => onDelete(todo.id, todo.template_id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </li>
  );
}
