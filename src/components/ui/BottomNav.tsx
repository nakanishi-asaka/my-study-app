"use client";

import Link from "next/link";
import { Home, BookOpen, Calendar, User } from "lucide-react";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const items = [
    { href: "/main/home", icon: <Home size={20} />, label: "ホーム" },
    {
      href: "/main/calendar",
      icon: <Calendar size={20} />,
      label: "カレンダー",
    },
    { href: "/main/notes", icon: <BookOpen size={20} />, label: "ノート" },
    { href: "/main/profile", icon: <User size={20} />, label: "プロフィール" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow flex justify-around py-2 z-50">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-col items-center text-sm ${
            pathname === item.href ? "text-blue-500" : "text-gray-500"
          }`}
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
