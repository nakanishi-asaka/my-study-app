"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

type Todo = {
  id: string;
  title: string;
  is_active: boolean;
};

type Props = {
  todos: Todo[];
  mode: "weekend" | "weekday";
  buttonLabel: string;
};

export default function TodoModal({ todos, mode, buttonLabel }: Props) {
  const [open, setOpen] = useState(false);

  console.log("🟩 Modal render", {
    mode,
    buttonLabel,
    key: `${mode}-${buttonLabel}`,
  });

  return (
    <div key={`${mode}-${buttonLabel}`}>
      <Button
        onClick={() => setOpen(true)}
        className={`inline-block ${
          mode === "weekend"
            ? "bg-green-500 hover:bg-green-600"
            : "bg-blue-500 hover:bg-blue-600"
        } text-white px-4 py-1 rounded-lg shadow`}
      >
        {buttonLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
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
    </div>
  );
}
