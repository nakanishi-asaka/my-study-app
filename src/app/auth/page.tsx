"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  // サインアップ
  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage("サインアップ失敗: " + error.message);
    } else {
      setMessage("サインアップ成功! ログインしてください");
    }
  };

  // ログイン
  const handleSignIn = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setMessage("ログイン失敗: " + error.message);
    } else {
      setMessage("ログイン成功!");
      console.log("ログイン成功:", data);
      router.push("/");
    }
  };

  // ログアウト
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMessage("ログアウトしました");
  };

  return (
    <div className="flex flex-col items-center p-8">
      <h1 className="text-2xl font-bold mb-4">ログイン / サインアップ</h1>
      <input
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border p-2 mb-2 rounded"
      />
      <input
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border p-2 mb-2 rounded"
      />

      <div className="flex gap-2 mb-4">
        <button
          onClick={handleSignUp}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          サインアップ
        </button>
        <button
          onClick={handleSignIn}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          ログイン
        </button>
        <button
          onClick={handleSignOut}
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          ログアウト
        </button>
      </div>

      {message && <p>{message}</p>}
    </div>
  );
}
