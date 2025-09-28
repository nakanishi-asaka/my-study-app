"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../app/supabaseClient";
import { Button } from "@/components/ui/button";

type Profile = {
  username: string | null;
  email: string | null;
};

export default function Header() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const getProfile = async () => {
      // 認証済みユーザーを取得
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // profile テーブルからユーザー名とメールを取得
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();

        setProfile({
          username: !error && data ? data.username : null,
          email: user.email ?? null, // ← auth.users 側の email を利用
        });
      }
    };

    getProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth/login"; // ログアウト後の遷移先
  };

  // 表示する名前を決定
  const displayName =
    profile?.username && profile.username.trim() !== ""
      ? profile.username
      : profile?.email ?? "ゲスト";

  return (
    <header className="flex justify-between items-center p-4 border-b bg-white">
      <p className="font-semibold text-gray-700">
        ログイン中：{displayName} さん
      </p>
      <Button onClick={handleLogout} variant="outline">
        ログアウト
      </Button>
    </header>
  );
}
