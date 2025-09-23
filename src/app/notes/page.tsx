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
  image_path?: string;
  image_signed_url?: string;
  author?: string;
  pinned: boolean;
  created_at: string; // Supabase returns ISO string for timestamps
};

export default function NotesPage() {
  const [user, setUser] = useState<any>(null);
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

  // ✅ セッション確認 & ユーザー設定
  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error("getUser error:", error);

      if (data?.user) {
        console.log("ログイン済み:", data.user);
        setUser(data.user);
      } else {
        console.warn("未ログイン状態");
      }
    };
    init();

    // セッション変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session);
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  //ノート一覧を取得
  useEffect(() => {
    const fetchRecords = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const userId = session.user.id;

      const { data, error } = await supabase
        .from("study_records")
        .select("*")
        .eq("user_id", userId)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fetch error:", error.message);
      }

      // ✅ 画像の signedUrl を発行
      const recordsWithUrls = await Promise.all(
        (data ?? []).map(async (r: any) => {
          if (r.type === "image" && r.image_url) {
            const { data: urlData } = await supabase.storage
              .from("record_images")
              .createSignedUrl(r.image_url, 60 * 60); // 1時間有効
            return { ...r, image_signed_url: urlData?.signedUrl };
          }
          return r;
        })
      );

      setRecords(recordsWithUrls as Record[]);
    };

    fetchRecords();
  }, []);

  //ノートを追加
  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      console.error("Not logged in");
      return;
    }

    let imageUrl = "";
    if (newRecord.type === "image" && newRecord.image_url instanceof File) {
      const file = newRecord.image_url;
      const filePath = `${session.user.id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("record_images") // ← ストレージバケット名（作成しておく）
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError.message);
        return;
      }

      imageUrl = filePath;
    }

    const { data, error } = await supabase
      .from("study_records")
      .insert([
        {
          type: newRecord.type,
          title: newRecord.title,
          content: newRecord.content,
          url: newRecord.url,
          image_url: imageUrl,
          author: newRecord.author,
          user_id: session.user.id,
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
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setNewRecord({
                      ...newRecord,
                      image_url: e.target.files[0] as any,
                    });
                  }
                }}
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
                className={`p-4 rounded-lg shadow-sm flex justify-between items-center ${
                  r.pinned ? "bg-yellow-100" : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                {/* 左側：テキスト */}
                <div className="flex-1">
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
                  {r.type === "image" && r.image_signed_url && (
                    <a
                      href={r.image_signed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2"
                    >
                      <img
                        src={r.image_signed_url}
                        alt={r.title}
                        className="mt-2 w-24 h-24 object-cover rounded-lg cursor-pointer border hover:opacity-80"
                      />
                    </a>
                  )}
                  {r.type === "book" && <p>著者: {r.author}</p>}
                </div>

                {/* 右端にピンアイコン配置 ピンをクリック→一番上へ*/}
                <button
                  onClick={async () => {
                    const { error } = await supabase
                      .from("study_records")
                      .update({ pinned: !r.pinned })
                      .eq("user_id", user.id)
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
                        .sort((a, b) => {
                          // ピンありは上に
                          if (a.pinned && !b.pinned) return -1;
                          if (!a.pinned && b.pinned) return 1;

                          // 両方同じ pinned 状態なら created_at の昇順に戻す
                          return (
                            new Date(a.created_at).getTime() -
                            new Date(b.created_at).getTime()
                          );
                        })
                    );
                  }}
                  className="ml-4 p-2 rounded-full  hover:bg-gray-300 self-center"
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
