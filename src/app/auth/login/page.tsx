"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../supabaseClient";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // ログイン
  const handleSignIn = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      console.log("ログイン成功:", data);

      //ログイン成功
      toast({
        title: "ログイン成功！",
      });

      //少し待ってからトップページへ
      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "ログイン失敗",
        description:
          error.message || "メールアドレスまたはパスワードを確認してください。",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md flex flex-col items-center justify-center bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
        <h1 className="text-2xl font-semibold text-center mb-6">ログイン</h1>

        <form className="space-y-5" onSubmit={handleSignIn}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              placeholder="例:test@exmaple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 mb-2 rounded-lg 
              focus:outline-none focus:ring-2 focus:ring-green-500 required"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>

            <input
              type="password"
              placeholder="例:123456pass"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border p-2 mb-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <button
            onClick={handleSignIn}
            className={`w-full font-medium py-2.5 rounded-lg transition-colors text-white ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {loading ? "ログイン中..." : "ログインする"}{" "}
          </button>

          {/* 新規登録へのリンク */}
          <p className="text-md text-center text-gray-600 mt-4">
            アカウントをお持ちでない方は{" "}
            <a href="/auth/SignUp" className="text-blue-600 hover:underline">
              新規登録
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
