"use client";

import Header from "@/components/ui/Header";
import BottomNav from "../../components/ui/BottomNav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pb-16">
      <Header />
      {children}
      <BottomNav />
    </div>
  );
}
