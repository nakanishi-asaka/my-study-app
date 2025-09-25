"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-bold">Welcome to the Home Page</h1>

      <p className="mt-4 text-lg">
        This is the main landing page of the application.
      </p>
      <Link href="/main/home">
        <button
          className="bg-green-900 text-white text-lg
       px-3 py-1 mt-3 cursor-pointer rounded-md hover:bg-green-700"
        >
          Todoへ
        </button>
      </Link>
    </div>
  );
}
