"use client";
import React, { useState } from "react";
import Link from "next/link";

const weekendTodos = [
  { id: 1, title: "模試を解く（90分）" },
  { id: 2, title: "参考書を2章読み切る" },
  { id: 3, title: "暗記カードの復習（100問）" },
];

export default function WeekendPage() {
  const [studyTime, setStudyTime] = useState("");

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex justify-center">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-6 text-center">
          休日の学習プラン
        </h1>

        {/* 勉強時間記録フォーム */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">勉強時間を記録</h2>
          <form
            className="flex gap-3 items-center"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="number"
              value={studyTime}
              onChange={(e) => setStudyTime(e.target.value)}
              placeholder="時間 (h)"
              className="w-24 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600 transition"
            >
              記録
            </button>
          </form>
        </section>

        {/* 休日Todo一覧 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">やることリスト</h2>
          <ul className="space-y-3 mb-6">
            {weekendTodos.map((todo) => (
              <li
                key={todo.id}
                className="p-4 bg-gray-50 rounded-md shadow-sm hover:bg-gray-100 transition"
              >
                {todo.title}
              </li>
            ))}
          </ul>
        </section>

        {/* リンクボタンエリア */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/"
            className="inline-block bg-gray-500 text-white px-4 py-2 rounded-lg shadow hover:bg-gray-600 transition text-center"
          >
            平日のTodoへ戻る
          </Link>
          <Link
            href="/notes"
            className="inline-block bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600 transition text-center"
          >
            勉強ノートへ
          </Link>
        </div>
      </div>
    </div>
  );
}
