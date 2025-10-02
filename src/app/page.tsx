"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-2xl text-center space-y-6">
        {/* タイトル */}
        <h1 className="text-2xl font-bold text-gray-800">My Study App </h1>
        <p className="text-gray-600">
          Todoを使って,、日々の積み上げを見える化しましょう。
        </p>

        {/* カード風の案内 */}
        <div className="p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg shadow">
          <p className="text-lg font-semibold text-gray-800 mb-2">
            今日から始めよう！
          </p>
          <p className="text-sm text-gray-600"></p>
        </div>

        {/* Todoページへ */}
        <Link href="/main/home">
          <Button className="w-full bg-sky-400 hover:bg-sky-600 text-white">
            Todoページへ進む
          </Button>
        </Link>
      </div>
    </div>
  );
}
