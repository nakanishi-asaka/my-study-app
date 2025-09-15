"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

type Reference = { title: string; url: string };
type ImageRef = { url: string; alt?: string };
type KeyPoint = { id: number; text: string; pinned?: boolean };

type Note = {
  id: number;
  subject: string; // 科目
  title: string; // トピック
  keyPoints: KeyPoint[]; // 要点（ピン留め対象）
  summary: string; // 本文サマリー（UI用）
  references: Reference[];
  images?: ImageRef[];
};

const DUMMY_NOTES: Note[] = [
  {
    id: 1,
    subject: "React",
    title: "Hooks の基礎（useState / useEffect）",
    keyPoints: [
      { id: 11, text: "useState: 値と更新関数を返す", pinned: true },
      {
        id: 12,
        text: "副作用は useEffect に分離（依存配列で制御）",
        pinned: true,
      },
      { id: 13, text: "再レンダリング条件：state/props/親の更新" },
    ],
    summary:
      "コンポーネントの状態管理は useState、DOM外の副作用は useEffect に切り分ける。依存配列を明示することで不要な実行を避ける。",
    references: [
      { title: "React Docs – Hooks", url: "https://react.dev/reference/react" },
    ],
    images: [
      {
        url: "https://via.placeholder.com/640x320?text=React+Hooks+diagram",
        alt: "Hooks diagram",
      },
    ],
  },
  {
    id: 2,
    subject: "英単語",
    title: "頻出動詞のコロケーション",
    keyPoints: [
      {
        id: 21,
        text: "take a risk / make a decision / do homework",
        pinned: true,
      },
      { id: 22, text: "動詞＋名詞の固定組み合わせは暗記優先" },
    ],
    summary:
      "コロケーションは文脈で覚えると定着が速い。例文を作りながら復習するとよい。",
    references: [
      {
        title: "Oxford Collocations",
        url: "https://www.oxfordlearnersdictionaries.com/",
      },
    ],
  },
  {
    id: 3,
    subject: "会計学",
    title: "損益分岐点（CVP分析）",
    keyPoints: [
      { id: 31, text: "損益分岐点売上高 = 固定費 / 限界利益率", pinned: true },
      { id: 32, text: "安全余裕率 = (実際売上高 - BEP) / 実際売上高" },
      { id: 33, text: "固定費・変動費の見極めが前提" },
    ],
    summary:
      "CVP分析ではコスト構造を固定費と変動費に分ける。限界利益率がカギとなる指標。",
    references: [{ title: "管理会計テキスト", url: "#" }],
  },
];

const SUBJECTS = Array.from(new Set(DUMMY_NOTES.map((n) => n.subject)));

export default function ReviewNotesPage() {
  const [selectedSubject, setSelectedSubject] = useState<string>("React");
  const [selectedNoteId, setSelectedNoteId] = useState<number>(1);
  const [search, setSearch] = useState("");
  const [pinnedOnly, setPinnedOnly] = useState(false);

  const notesBySubject = useMemo(
    () => DUMMY_NOTES.filter((n) => n.subject === selectedSubject),
    [selectedSubject]
  );

  const filteredNotes = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return notesBySubject;
    return notesBySubject.filter(
      (n) =>
        n.title.toLowerCase().includes(kw) ||
        n.summary.toLowerCase().includes(kw) ||
        n.keyPoints.some((k) => k.text.toLowerCase().includes(kw))
    );
  }, [notesBySubject, search]);

  const activeNote =
    filteredNotes.find((n) => n.id === selectedNoteId) ?? filteredNotes[0];

  // 選択変更時の初期化（科目切替でノートも先頭に）
  React.useEffect(() => {
    const first = DUMMY_NOTES.find((n) => n.subject === selectedSubject);
    if (first) setSelectedNoteId(first.id);
  }, [selectedSubject]);

  const pinnedKeyPoints = activeNote?.keyPoints.filter((k) => k.pinned);
  const visibleKeyPoints = pinnedOnly
    ? activeNote?.keyPoints.filter((k) => k.pinned)
    : activeNote?.keyPoints;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold">復習ノート</h1>
          <nav className="flex gap-2">
            <Link
              href="/"
              className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
            >
              平日Todo
            </Link>
            <Link
              href="/notes"
              className="px-3 py-2 rounded-lg bg-blue-100 hover:bg-blue-200"
            >
              勉強ノート
            </Link>
            <Link
              href="/weekend"
              className="px-3 py-2 rounded-lg bg-green-100 hover:bg-green-200"
            >
              休日学習
            </Link>
          </nav>
        </div>
      </header>

      {/* 本体 */}
      <div className="mx-auto max-w-6xl p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* サイドバー：科目・検索 */}
        <aside className="md:col-span-3">
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-semibold mb-3">科目</h2>
            <ul className="space-y-2 mb-4">
              {SUBJECTS.map((s) => {
                const count = DUMMY_NOTES.filter((n) => n.subject === s).length;
                const active = s === selectedSubject;
                return (
                  <li key={s}>
                    <button
                      onClick={() => setSelectedSubject(s)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition ${
                        active
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      <span className="font-medium">{s}</span>
                      <span
                        className={`ml-2 text-xs ${
                          active ? "text-blue-50" : "text-gray-500"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="space-y-2">
              <label className="text-sm text-gray-600">検索</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="キーワードで絞り込み"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                id="pinnedOnly"
                type="checkbox"
                className="h-4 w-4"
                checked={pinnedOnly}
                onChange={(e) => setPinnedOnly(e.target.checked)}
              />
              <label htmlFor="pinnedOnly" className="text-sm">
                ピン留めのみ表示
              </label>
            </div>
          </div>

          {/* トピック一覧 */}
          <div className="bg-white rounded-2xl shadow p-4 mt-4">
            <h2 className="font-semibold mb-3">トピック</h2>
            <ul className="space-y-2 max-h-[40vh] overflow-auto pr-1">
              {filteredNotes.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => setSelectedNoteId(n.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition ${
                      n.id === (activeNote?.id ?? -1)
                        ? "bg-yellow-100"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    <p className="font-medium">{n.title}</p>
                    <p className="text-xs text-gray-500">{n.subject}</p>
                  </button>
                </li>
              ))}
              {filteredNotes.length === 0 && (
                <li className="text-sm text-gray-500 px-1">
                  一致するトピックがありません
                </li>
              )}
            </ul>
          </div>
        </aside>

        {/* メイン：ノート本文 */}
        <main className="md:col-span-9">
          {activeNote ? (
            <div className="space-y-6">
              {/* ピンのハイライト */}
              {pinnedKeyPoints && pinnedKeyPoints.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📌</span>
                    <h3 className="font-semibold">要点（ピン留め）</h3>
                  </div>
                  <ul className="list-disc pl-6 space-y-1">
                    {pinnedKeyPoints.map((kp) => (
                      <li key={kp.id} className="text-gray-800">
                        {kp.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* タイトル・概要 */}
              <div className="bg-white rounded-2xl shadow p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div>
                    <p className="text-xs text-gray-500">
                      {activeNote.subject}
                    </p>
                    <h2 className="text-xl sm:text-2xl font-bold">
                      {activeNote.title}
                    </h2>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100"
                      title="（UIのみ）このノートをピン留め一覧に固定する想定のボタン"
                    >
                      📌 ノートをピン
                    </button>
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                    >
                      共有
                    </button>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  {activeNote.summary}
                </p>
              </div>

              {/* 要点リスト（ピン切替対応） */}
              <div className="bg-white rounded-2xl shadow p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">要点</h3>
                  <span className="text-sm text-gray-500">
                    {pinnedOnly ? "ピンのみ表示中" : "すべて表示中"}
                  </span>
                </div>
                <ul className="space-y-2">
                  {visibleKeyPoints?.map((kp) => (
                    <li
                      key={kp.id}
                      className="flex items-start justify-between gap-3 bg-gray-50 rounded-xl px-3 py-2"
                    >
                      <span className="text-gray-800">{kp.text}</span>
                      <button
                        type="button"
                        className={`text-sm px-2 py-1 rounded-md border ${
                          kp.pinned
                            ? "bg-yellow-100 border-yellow-300"
                            : "bg-white hover:bg-gray-100 border-gray-300"
                        }`}
                        title="（UIのみ）この要点をピン留め/解除する想定のボタン"
                      >
                        {kp.pinned ? "📌 ピン済" : "📌 ピン"}
                      </button>
                    </li>
                  ))}
                  {visibleKeyPoints?.length === 0 && (
                    <li className="text-sm text-gray-500">
                      表示する要点がありません
                    </li>
                  )}
                </ul>
              </div>

              {/* 参考・添付 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow p-6">
                  <h3 className="font-semibold mb-3">参考リンク</h3>
                  <ul className="space-y-2">
                    {activeNote.references.map((ref, i) => (
                      <li key={i}>
                        <a
                          href={ref.url}
                          target="_blank"
                          className="text-blue-600 underline break-all"
                        >
                          {ref.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white rounded-2xl shadow p-6">
                  <h3 className="font-semibold mb-3">画像 / スクショ</h3>
                  {activeNote.images && activeNote.images.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {activeNote.images.map((img, i) => (
                        <img
                          key={i}
                          src={img.url}
                          alt={img.alt ?? "note image"}
                          className="rounded-xl w-full h-28 object-cover"
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      添付画像はありません
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">表示できるノートがありません</div>
          )}
        </main>
      </div>
    </div>
  );
}
