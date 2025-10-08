"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  /* サインアップ(実装予定)
  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage("サインアップ失敗: " + error.message);
    } else {
      setMessage("サインアップ成功! ログインしてください");
    }
  };
  */

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
      router.push("/"); // ホームへリダイレクト
    }
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
          disabled
          className="bg-blue-500 text-white px-4 py-2 rounded cursor-not-allowed opacity-60"
        >
          サインアップ(準備中)
        </button>
        <button
          onClick={handleSignIn}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          ログイン
        </button>
      </div>

      {message && <p>{message}</p>}
    </div>
  );
}
