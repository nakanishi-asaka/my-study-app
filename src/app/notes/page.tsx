"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../supabaseClient";
import { Pin, PinOff } from "lucide-react";

type Record = {
  id: number;
  type: "note" | "link" | "image" | "book";
  title: string;
  content?: string;
  url?: string;
  image_url?: string;
  author?: string;
  pinned: boolean;
};

export default function NotesPage() {
  const [records, setRecords] = useState<Record[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newRecord, setNewRecord] = useState({
    type: "note",
    title: "",
    content: "",
    url: "",
    image_url: "",
    author: "",
  });

  useEffect(() => {
    const fetchRecords = async () => {
      const { data, error } = await supabase
        .from("study_records")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fetch error:", error.message);
      } else {
        setRecords(data as Record[]);
      }
    };

    fetchRecords();
  }, []);

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from("study_records")
      .insert([
        {
          type: newRecord.type,
          title: newRecord.title,
          content: newRecord.content,
          url: newRecord.url,
          image_url: newRecord.image_url,
          author: newRecord.author,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error.message);
      return;
    }
    // 成功したら state に追加
    setRecords([data as Record, ...records]);

    // フォームリセット
    setNewRecord({
      type: "note",
      title: "",
      content: "",
      url: "",
      image_url: "",
      author: "",
    });
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex justify-center">
      <div className="w-full max-w-3xl bg-white shadow-lg rounded-xl p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">学習記録</h1>

        {/* 追加ボタン */}
        <div className="text-center mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600 transition"
          >
            ＋ 新しい記録を追加
          </button>
        </div>

        {/* 入力フォーム */}
        {showForm && (
          <form
            onSubmit={handleAddRecord}
            className="mb-8 p-4 border rounded-lg bg-gray-50 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium">タイトル</label>
              <input
                type="text"
                value={newRecord.title}
                onChange={(e) =>
                  setNewRecord({ ...newRecord, title: e.target.value })
                }
                className="mt-1 w-full border rounded px-2 py-1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">タイプ</label>
              <select
                value={newRecord.type}
                onChange={(e) =>
                  setNewRecord({ ...newRecord, type: e.target.value })
                }
                className="mt-1 w-full border rounded px-2 py-1"
              >
                <option value="note">メモ</option>
                <option value="image">画像</option>
                <option value="link">リンク</option>
                <option value="book">書籍</option>
              </select>
            </div>

            {newRecord.type === "note" && (
              <textarea
                value={newRecord.content}
                onChange={(e) =>
                  setNewRecord({ ...newRecord, content: e.target.value })
                }
                className="mt-1 w-full border rounded px-2 py-1"
              />
            )}

            {newRecord.type === "link" && (
              <input
                type="url"
                value={newRecord.url}
                onChange={(e) =>
                  setNewRecord({ ...newRecord, url: e.target.value })
                }
                className="mt-1 w-full border rounded px-2 py-1"
              />
            )}

            {newRecord.type === "image" && (
              <input
                type="url"
                value={newRecord.image_url}
                onChange={(e) =>
                  setNewRecord({ ...newRecord, image_url: e.target.value })
                }
                className="mt-1 w-full border rounded px-2 py-1"
              />
            )}

            {newRecord.type === "book" && (
              <input
                type="text"
                value={newRecord.author}
                onChange={(e) =>
                  setNewRecord({ ...newRecord, author: e.target.value })
                }
                className="mt-1 w-full border rounded px-2 py-1"
              />
            )}

            <button
              type="submit"
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
            >
              保存
            </button>
          </form>
        )}

        {/* 全記録一覧 */}
        <section>
          <h2 className="text-xl font-semibold mb-4">📚 記録一覧</h2>
          <ul className="space-y-4">
            {records.map((r) => (
              <li
                key={r.id}
                className="relative p-4 bg-gray-100 rounded-lg shadow-sm hover:bg-gray-200"
              >
                <strong className="block text-lg">{r.title}</strong>
                {r.type === "note" && <p>{r.content}</p>}
                {r.type === "link" && (
                  <a
                    href={r.url ?? ""}
                    target="_blank"
                    className="text-blue-600 underline mt-1 inline-block"
                  >
                    {r.url}
                  </a>
                )}
                {r.type === "image" && (
                  <img
                    src={r.image_url ?? ""}
                    alt={r.title}
                    className="mt-2 rounded-lg"
                  />
                )}
                {r.type === "book" && <p>著者: {r.author}</p>}
                {/* 右上にピンアイコン配置 */}
                <button
                  onClick={async () => {
                    const { error } = await supabase
                      .from("study_records")
                      .update({ pinned: !r.pinned })
                      .eq("id", r.id);

                    if (error) {
                      console.error("Update error:", error.message);
                      return;
                    }

                    // state更新
                    setRecords((prev) =>
                      prev
                        .map((rec) =>
                          rec.id === r.id
                            ? { ...rec, pinned: !rec.pinned }
                            : rec
                        )
                        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
                    );
                  }}
                  className="absolute top-2 right-2 p-2 rounded-full hover:bg-gray-300"
                >
                  {r.pinned ? (
                    <Pin className="w-5 h-5 text-yellow-600" />
                  ) : (
                    <PinOff className="w-5 h-5 text-gray-500" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* ホームへ戻る */}
        <div className="text-center mt-10">
          <Link
            href="/"
            className="inline-block bg-gray-500 text-white px-4 py-2 rounded-lg shadow hover:bg-gray-600 transition"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
