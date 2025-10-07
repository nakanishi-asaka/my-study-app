// src/types/todo.ts

export type Todo = {
  id: string; // SupabaseのUUID（英数字）
  title: string;
  template_id: string | null;
  is_done: boolean;
  updated_at?: string;
  todo_templates?: {
    id: string;
    title: string;
  } | null;
};
