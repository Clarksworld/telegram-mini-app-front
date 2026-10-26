"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { label: "Home", path: "/", icon: "🏠" },
    { label: "Deposit", path: "/deposit", icon: "💰" },
    { label: "Trade", path: "/trade", icon: "📈" },
    { label: "Settings", path: "/settings", icon: "⚙️" },
  ];

  return (
    <nav className="p-3 border-t border-zinc-800/80 bg-zinc-900/90 backdrop-blur-md flex justify-around items-center sticky bottom-0 z-50">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className={`flex flex-col items-center gap-1 transition-all ${
              isActive
                ? "text-blue-400 font-semibold scale-105"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[10px] tracking-wide">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
