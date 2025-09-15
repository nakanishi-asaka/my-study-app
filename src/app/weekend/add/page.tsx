"use client";
import React, { useState } from "react";
import Link from "next/link";

export default function AddWeekendTodoPage() {
  const [title, setTitle] = useState("");

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex justify-center">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">休日Todoを追加</h1>

        {/* 追加フォーム */}
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="休日にやることを入力"
            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            className="bg-purple-500 text-white px-4 py-2 rounded-lg shadow hover:bg-purple-600 transition"
          >
            追加
          </button>
        </form>

        {/* 戻るリンク */}
        <div className="mt-6 text-center">
          <Link href="/weekend" className="text-purple-600 hover:underline">
            ← 休日学習プランへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
