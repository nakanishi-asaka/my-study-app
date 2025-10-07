"use client";

import TodoItem from "./TodoItem";
import { Todo } from "../../../types/todo";

type TodoListProps = {
  todos: Todo[];
  loading: boolean;
  onToggle: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string, templateId: string | null) => void;
};

export default function TodoList({
  todos,
  loading,
  onToggle,
  onEdit,
  onDelete,
}: TodoListProps) {
  if (loading) {
    return <p className="text-gray-500">読み込み中...</p>;
  }

  if (todos.length === 0) {
    return <p className="text-gray-500 text-center">Todoがありません</p>;
  }

  return (
    <ul className="space-y-3">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
