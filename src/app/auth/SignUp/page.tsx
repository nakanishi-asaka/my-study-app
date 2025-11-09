//新規ユーザー登録ページ

"use client";

import { useState } from "react";
import { supabase } from "@/app/supabaseClient";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConf, setPasswordConf] = useState("");

  // フォーム送信時の処理
  const onSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
      });
      if (signUpError) {
        throw signUpError;
      }
      alert("登録完了メールを確認してください");
    } catch (error) {
      alert("エラーが発生しました");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
        <h1 className="text-2xl font-semibold text-center mb-6">
          新規ユーザー登録
        </h1>

        <form className="space-y-5" onSubmit={onSubmit}>
          {/* メール */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* パスワード */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <input
              type="password"
              placeholder="8文字以上"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* パスワード確認用 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード（確認）
            </label>
            <input
              type="password"
              placeholder="8文字以上"
              value={passwordConf}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => setPasswordConf(e.target.value)}
              required
            />
          </div>

          {/* 登録ボタン */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            登録する
          </button>

          {/* ログインへのリンク */}
          <p className="text-sm text-center text-gray-600 mt-4">
            すでにアカウントをお持ちの方は{" "}
            <a href="/auth/login" className="text-blue-600 hover:underline">
              ログイン
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
