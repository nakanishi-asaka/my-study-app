"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Pin, PinOff, X } from "lucide-react";

//supabaseから取ってくる用(DBと同じ型)
type StudyRecord = {
  id: number;
  user_id: string;
  type: "note" | "link" | "image" | "book";
  title: string;
  content?: string;
  url?: string;
  image_url?: string | File | null;
  author?: string | null;
  pinned: boolean;
  created_at: string; // Supabase returns ISO string for timestamps
};

//入力フォーム用の型
type NewStudyRecord = Omit<
  StudyRecord,
  "id" | "user_id" | "pinned" | "created_at"
> & {
  image_url?: string | File | null;
};

// 表示用に拡張した型（サインドURLなどを追加）
export type StudyRecordWithSignedUrl = StudyRecord & {
  image_signed_url?: string;
};

export default function NotesPage() {
  const [user, setUser] = useState<any>(null);
  const [records, setRecords] = useState<StudyRecordWithSignedUrl[]>([]);
  const [searchTerm, setSearchTerm] = useState(""); // 🔍 検索キーワード
  const [sortKey, setSortKey] = useState<"created_at" | "title">("created_at"); // ↕️ ソート対象
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc"); // 並
  const [showForm, setShowForm] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<StudyRecord>>({});
  const [newRecord, setNewRecord] = useState<NewStudyRecord>({
    type: "note",
    title: "",
    content: "",
    url: "",
    image_url: null,
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
      const recordsWithUrls: StudyRecordWithSignedUrl[] = await Promise.all(
        (data ?? []).map(async (r) => {
          if (r.type === "image" && r.image_url) {
            const { data: urlData, error: urlError } = await supabase.storage
              .from("record_images")
              .createSignedUrl(r.image_url, 60 * 60); // 1時間有効

            if (urlError) {
              console.warn("Signed URL 生成失敗:", urlError.message);
              return r;
            }
            return { ...r, image_signed_url: urlData.signedUrl };
          }
          return r;
        })
      );

      setRecords(recordsWithUrls);
    };

    fetchRecords();
  }, []);

  // 🔍 検索対象は全件
  const searchedRecords = records.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.title.toLowerCase().includes(term) ||
      (r.content?.toLowerCase().includes(term) ?? false) ||
      (r.url?.toLowerCase().includes(term) ?? false) ||
      (r.author?.toLowerCase().includes(term) ?? false)
    );
  });

  // 📌 ピン止めとそれ以外に分ける
  const pinnedRecords = searchedRecords.filter((r) => r.pinned);

  const notPinnedRecords = searchedRecords
    .filter((r) => !r.pinned)
    .sort((a, b) => {
      if (sortKey === "created_at") {
        const t1 = new Date(a.created_at).getTime();
        const t2 = new Date(b.created_at).getTime();
        return sortOrder === "asc" ? t1 - t2 : t2 - t1;
      } else if (sortKey === "title") {
        return sortOrder === "asc"
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
      return 0;
    });

  // ✅ 表示順は「ピン止め → 非ピン止め」
  const filteredRecords = [...pinnedRecords, ...notPinnedRecords];

  //ノートを追加
  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();

    //ユーザー取得
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      console.error("Not logged in");
      return;
    }

    let imageUrl = "";
    let imageSignedUrl: string | undefined = undefined;

    // 画像アップロード処理
    if (newRecord.type === "image" && newRecord.image_url instanceof File) {
      const file = newRecord.image_url;

      // ファイル名をエンコード or 英数字のみに変換
      const safeFileName = file.name
        .replace(/\s+/g, "_") // スペースをアンダースコアに
        .replace(/[^\w.-]/g, ""); // 日本語や記号を除去
      const filePath = `${session.user.id}/${Date.now()}-${safeFileName}`;

      //ファイルをアップロード
      const { error: uploadError } = await supabase.storage
        .from("record_images") // ← ストレージバケット名（作成しておく）
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError.message);
        return;
      }

      imageUrl = filePath;

      // signed URL を生成
      const { data: urlData, error: urlError } = await supabase.storage
        .from("record_images")
        .createSignedUrl(filePath, 60 * 60); // 1時間有効

      if (urlError) {
        console.warn("Signed URL generation failed:", urlError.message);
      } else {
        imageSignedUrl = urlData.signedUrl;
      }
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
    setRecords([
      {
        ...(data as StudyRecord),
        image_signed_url: imageSignedUrl,
      },
      ...records,
    ]);

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

  // 編集→保存処理
  const handleSave = async (id: number) => {
    if (!user) return;

    // ✅ DBに存在するカラムだけ抽出
    const allowedKeys = [
      "title",
      "content",
      "url",
      "image_url",
      "author",
      "pinned",
    ];
    const filteredValues = Object.fromEntries(
      Object.entries(editValues).filter(([key]) => allowedKeys.includes(key))
    );

    if (Object.keys(filteredValues).length === 0) {
      console.warn("更新対象なし");
      setEditingId(null);
      return;
    }

    const { error, data } = await supabase
      .from("study_records")
      .update(filteredValues)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Update error:", error.message);
      return;
    }

    setRecords((prev) =>
      prev.map((rec) => (rec.id === id ? { ...rec, ...data } : rec))
    );
    setEditingId(null);
    setEditValues({});
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 flex justify-center">
      <div className="w-full max-w-3xl bg-white shadow-lg rounded-xl px-4 py-3">
        <h1 className="text-2xl font-bold mb-6 text-center">学習記録</h1>

        {/* 🔍 検索 & ソート UI */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="検索 (タイトル・内容・著者など)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as any)}
            className="border rounded px-2 py-2"
          >
            <option value="created_at">作成日</option>
            <option value="title">タイトル</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="border rounded px-2 py-2"
          >
            <option value="desc">降順</option>
            <option value="asc">昇順</option>
          </select>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4">
          {/* 追加ボタン */}
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600 transition w-full sm:w-1/2"
          >
            ＋ 新しい記録を追加
          </button>

          {/* 編集モード ボタン*/}
          <button
            onClick={() => setEditMode(!editMode)}
            className={`px-4 py-2 rounded-lg shadow transition w-full sm:w-1/2 ${
              editMode
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-gray-300 hover:bg-gray-400"
            }`}
          >
            {editMode ? "編集モード終了" : "編集モードへ"}
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
                  setNewRecord({
                    ...newRecord,
                    type: e.target.value as "note" | "link" | "image" | "book",
                  })
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
                value={newRecord.author ?? ""}
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
            {filteredRecords.map((r) => (
              <li
                key={r.id}
                className={`p-4 rounded-lg shadow-sm flex justify-between items-center ${
                  r.pinned ? "bg-yellow-100" : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                <div className="flex-1">
                  {editingId === r.id ? (
                    <>
                      {/* タイトル編集 */}
                      <input
                        type="text"
                        value={editValues.title ?? r.title}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            title: e.target.value,
                          })
                        }
                        className="border px-2 py-1 rounded w-full mb-2"
                      />

                      {/* タイプごとの編集欄 */}
                      {r.type === "note" && (
                        <textarea
                          value={editValues.content ?? r.content ?? ""}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              content: e.target.value,
                            })
                          }
                          className="border px-2 py-1 rounded w-full"
                        />
                      )}

                      {r.type === "link" && (
                        <input
                          type="url"
                          value={editValues.url ?? r.url ?? ""}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              url: e.target.value,
                            })
                          }
                          className="border px-2 py-1 rounded w-full overflow-hidden text-ellipsis"
                          style={{ whiteSpace: "nowrap" }}
                        />
                      )}

                      {r.type === "book" && (
                        <input
                          type="text"
                          value={editValues.author ?? r.author ?? ""}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              author: e.target.value,
                            })
                          }
                          className="border px-2 py-1 rounded w-full"
                        />
                      )}

                      {/* 画像タイプはタイトルのみ編集 */}
                      {r.type === "image" && r.image_signed_url && (
                        <img
                          src={r.image_signed_url}
                          alt={r.title}
                          className="mt-2 w-24 h-24 object-cover rounded-lg border"
                        />
                      )}

                      {/* 保存/キャンセル */}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleSave(r.id)}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditValues({});
                          }}
                          className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                        >
                          キャンセル
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <strong className="block text-lg">{r.title}</strong>
                      {r.type === "note" && <p>{r.content}</p>}
                      {r.type === "link" && (
                        <a
                          href={r.url ?? ""}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline mt-1 inline-block truncate max-w-[250px] sm:max-w-[400px]"
                        >
                          {r.url}
                        </a>
                      )}
                      {r.type === "book" && <p>著者: {r.author}</p>}
                      {r.type === "image" && r.image_signed_url && (
                        <img
                          src={r.image_signed_url}
                          alt={r.title}
                          className="mt-2 w-24 h-24 object-cover rounded-lg cursor-pointer border hover:opacity-80"
                          onClick={() => setModalImage(r.image_signed_url!)}
                        />
                      )}
                    </>
                  )}
                </div>

                {/* 📌 ピン止め/解除ボタン */}
                <button
                  onClick={async () => {
                    const { data, error } = await supabase
                      .from("study_records")
                      .update({ pinned: !r.pinned })
                      .eq("id", r.id)
                      .eq("user_id", user.id)
                      .select()
                      .single();

                    if (error) {
                      console.error("Pin update error:", error.message);
                      return;
                    }

                    // state 更新
                    setRecords((prev) =>
                      prev.map((rec) =>
                        rec.id === r.id ? { ...rec, ...data } : rec
                      )
                    );
                  }}
                  className="ml-2 text-gray-600 hover:text-yellow-600"
                  title={r.pinned ? "ピンを外す" : "ピン止めする"}
                >
                  {r.pinned ? <PinOff size={20} /> : <Pin size={20} />}
                </button>

                {/* 編集モード ON のときだけ「編集」「削除」ボタンを表示 */}
                {editMode && editingId !== r.id && (
                  <div className="flex gap-2 ml-2">
                    <button
                      onClick={() => {
                        setEditingId(r.id);
                        setEditValues(r); // 現在の値をコピー
                      }}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      編集
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm("本当に削除しますか？")) {
                          const { error } = await supabase
                            .from("study_records")
                            .delete()
                            .eq("id", r.id)
                            .eq("user_id", user.id);

                          if (error) {
                            console.error("Delete error:", error.message);
                            return;
                          }
                          if (
                            r.type === "image" &&
                            typeof r.image_url === "string"
                          ) {
                            const { error: storageError } =
                              await supabase.storage
                                .from("record_images")
                                .remove([r.image_url]);

                            if (storageError) {
                              console.error(
                                "Storage delete error:",
                                storageError.message
                              );
                            }
                          }

                          setRecords((prev) =>
                            prev.filter((rec) => rec.id !== r.id)
                          );
                        }
                      }}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      削除
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* 画像モーダル */}
        {modalImage && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center">
            <div className="relative max-w-3xl max-h-[80vh]">
              <button
                className="absolute top-2 right-2 bg-white rounded-full p-2 shadow hover:bg-gray-200"
                onClick={() => setModalImage(null)}
              >
                <X className="w-6 h-6 text-gray-800" />
              </button>
              <img
                src={modalImage}
                alt="拡大画像"
                className="rounded-lg max-h-[80vh] object-contain"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
