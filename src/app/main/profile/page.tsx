"use client";

import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../../supabaseClient";

export default function ProfilePage() {
  const [userId, setUserId] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [examDate, setExamDate] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dayRolloverHour, setDayRolloverHour] = useState<number>(3);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ✅ ログインユーザーの情報 + プロフィール取得
  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("ログインしてください");
        return;
      }

      setUserId(user.id);

      // デバッグ: ログインユーザーの情報
      console.log("🔑 Auth user:", user);

      const { data, error } = await supabase
        .from("profiles")
        .select("username, exam_date, avatar_url,day_rollover_hour")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("プロフィール取得エラー:", error);
        setMessage("プロフィールの取得に失敗しました");
        return;
      }

      if (data) {
        setUsername(data.username || "");
        setExamDate(data.exam_date || "");
        setAvatarPreview(data.avatar_url || null);
        setDayRolloverHour(data.day_rollover_hour ?? 3);
      }
    };

    fetchProfile();
  }, []);

  // アバタープレビューの更新
  useEffect(() => {
    if (!avatarFile) return;
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  //アバター選択
  function onSelectAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    // Optional: basic validation
    if (!f.type.startsWith("image/")) {
      setMessage("画像ファイルを選択してください。");
      return;
    }
    if (f.size > 3 * 1024 * 1024) {
      setMessage("ファイルサイズは3MB以下にしてください。");
      return;
    }
    setMessage(null);
    setAvatarFile(f);
  }

  async function handleSave() {
    if (!userId) {
      setMessage("ログインしてください");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      let avatarUrl: string | null = avatarPreview;

      // ✅ ファイルが選ばれていたら Storage にアップロード
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();

        const filePath = `${userId}/avatar.${fileExt}`;

        // 上書き保存 (既存があれば置き換え)
        const { error: uploadError } = await supabase.storage
          .from("avatar_url")
          .upload(filePath, avatarFile, {
            upsert: true,
            metadata: { user_id: userId },
          });

        if (uploadError) throw uploadError;

        // 公開URLを取得
        const { data: urlData } = supabase.storage
          .from("avatar_url")
          .getPublicUrl(filePath);

        avatarUrl = urlData.publicUrl;
      }

      //dbに保存
      const { error } = await supabase.from("profiles").upsert(
        {
          id: userId, // user.id = auth.users のUUID
          username,
          exam_date: examDate,
          avatar_url: avatarUrl,
          day_rollover_hour: dayRolloverHour,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" } //既存レコードの更新
      );

      if (error) throw error;

      setMessage("プロフィールを保存しました！");
    } catch (e: any) {
      console.error("保存エラー:", e);
      setMessage("保存中にエラーが発生しました。");
    } finally {
      setSaving(false);
    }
  }

  //アバター削除
  function handleRemoveAvatar() {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const isValidUsername = username.trim().length >= 2;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <main className="w-full max-w-2xl bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-2xl font-semibold mb-4">プロフィール</h1>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Avatar column */}
          <div className="flex flex-col items-center md:items-start">
            <div className="w-36 h-36 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="アバターのプレビュー"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-sm text-slate-400 p-3 text-center">
                  アバターがまだ設定されていません
                </div>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <label className="inline-flex items-center px-3 py-2 rounded-lg border cursor-pointer text-sm bg-white hover:bg-slate-50">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onSelectAvatar}
                />
                アップロード
              </label>

              {avatarPreview && (
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-2 rounded-lg border text-sm bg-white hover:bg-slate-50"
                  onClick={handleRemoveAvatar}
                >
                  削除
                </button>
              )}
            </div>

            <p className="mt-3 text-xs text-gray-500">
              推奨: PNG/JPEG, 3MB 以下
            </p>
          </div>

          {/* Form column */}
          <div className="md:col-span-2">
            <label className="block">
              <div className="text-sm font-medium">ユーザー名</div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="例：nakani_shi"
                aria-label="ユーザー名"
                className="mt-2 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              <p className="text-xs mt-1 text-slate-500">
                2文字以上で入力してください。
              </p>
            </label>

            <label className="block mt-5">
              <div className="text-sm font-medium">試験日</div>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                aria-label="試験日"
                className="mt-2 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              <p className="text-xs mt-1 text-slate-500">例：2025-12-01</p>
            </label>

            {/* ✅ 追加: 日付切替時間 */}
            <label className="block">
              <div className="text-sm font-medium">日付切替時間 (時)</div>
              <input
                type="number"
                min={0}
                max={23}
                value={dayRolloverHour}
                onChange={(e) => setDayRolloverHour(Number(e.target.value))}
                className="mt-2 w-24 rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              <p className="text-xs mt-1 text-slate-500">
                例: 3 → 3時を過ぎたら翌日扱い
              </p>
            </label>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={!isValidUsername || saving}
                className={`px-4 py-2 rounded-lg text-white ${
                  isValidUsername
                    ? "bg-sky-600 hover:bg-sky-700"
                    : "bg-slate-300 cursor-not-allowed"
                }`}
              >
                {saving ? "保存中..." : "保存する"}
              </button>
            </div>

            {message && (
              <div className="mt-4 text-sm text-slate-700">{message}</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
