"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Todo = {
  id: string;
  title: string;
  is_active: boolean;
};

type Props = {
  todos: Todo[];
  mode: "weekend" | "weekday";
};

export default function TodoModal({
  todos,
  mode,
  buttonLabel,
}: {
  todos: Todo[];
  mode: "weekend" | "weekday";
  buttonLabel: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className={`inline-block ${
            mode === "weekend"
              ? "bg-green-500 hover:bg-green-600"
              : "bg-blue-500 hover:bg-blue-600"
          } text-white px-4 py-1 rounded-lg shadow`}
        >
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "weekday" ? "平日Todo一覧" : "休日Todo一覧"}
          </DialogTitle>
        </DialogHeader>
        {todos.length === 0 ? (
          <p className="text-gray-500">
            {" "}
            {mode === "weekday" ? "平日Todo一覧" : "休日Todo一覧"}
          </p>
        ) : (
          <ul className="space-y-2">
            {todos.map((t) => (
              <li
                key={t.id}
                className="p-3 bg-gray-50 rounded shadow-sm flex justify-between"
              >
                <span>{t.title}</span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
