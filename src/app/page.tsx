"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useAppStore } from "@/store/useAppStore";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function Home() {
  const { user, setUser, setInitData, setAuth } = useAppStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState("Initializing...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeTMA = async () => {
      try {
        setLoadingStep("Connecting to Telegram...");
        // 1. Access Telegram WebApp SDK
        const webApp = (window as any).Telegram?.WebApp;

        if (!webApp) {
          setError("Telegram WebApp SDK not found. Please open this app within Telegram.");
          setLoading(false);
          return;
        }

        setLoadingStep("Verifying identity...");
        // 2. Get initData for authentication
        const initData = webApp.initData;
        if (!initData || initData.trim() === "") {
          setError("No initialization data found. This app must be opened inside Telegram.");
          setLoading(false);
          return;
        }

        setInitData(initData);

        setLoadingStep("Fetching your wallet...");
        // 3. Authenticate with backend
        const response = await axios.get(`${API_BASE_URL}/profile`, {
          headers: {
            Authorization: `tma ${initData}`,
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          timeout: 8000,
        });

        if (typeof response.data === "string" && response.data.includes("<!DOCTYPE html>")) {
          throw new Error("Backend returned a warning page. Please open the API URL in your browser first to bypass it.");
        }

        if (response.data && response.data.user) {
          setUser(response.data.user);
          setAuth(true);
        } else {
          throw new Error("Backend responded successfully but user data is missing.");
        }
      } catch (err: any) {
        console.error("Auth error:", err);
        let message = "Failed to connect to the server.";
        if (err.response?.data?.error) {
          message = err.response.data.error;
        } else if (err.message) {
          message = err.message;
        }
        setError(`Auth Error: ${message}`);
      } finally {
        setLoading(false);
      }
    };

    initializeTMA();
  }, [setUser, setInitData, setAuth]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-900 text-white">
        <div className="text-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="text-lg font-medium">{loadingStep}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-900 text-white p-6">
        <div className="text-center max-w-sm">
          <div className="mb-4 text-red-500 text-5xl">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Authentication Error</h2>
          <p className="text-zinc-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 rounded-full font-medium hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900 text-white font-sans">
      {/* Header */}
      <header className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          TMA Trader
        </h1>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center text-xs font-bold">
            {user?.first_name?.charAt(0) || "U"}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Welcome Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-indigo-100 text-sm font-medium opacity-80">Welcome back,</p>
            <h2 className="text-2xl font-bold text-white mb-4">
              {user?.first_name} {user?.last_name || ""}
            </h2>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 inline-block">
              <p className="text-xs text-indigo-100 opacity-70">Current Balance</p>
              <p className="text-3xl font-mono font-bold">$0.00</p>
            </div>
          </div>
          {/* Decorative circle */}
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button className="p-4 bg-zinc-800 rounded-2xl border border-zinc-700 hover:bg-zinc-700 transition-all text-left group">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              📈
            </div>
            <p className="font-semibold">Trade</p>
            <p className="text-xs text-zinc-500">Buy/Sell assets</p>
          </button>
          <button
            onClick={() => router.push('/deposit')}
            className="p-4 bg-zinc-800 rounded-2xl border border-zinc-700 hover:bg-zinc-700 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              💰
            </div>
            <p className="font-semibold">Deposit</p>
            <p className="text-xs text-zinc-500">Add funds</p>
          </button>
        </div>

        {/* Account Info */}
        <div className="bg-zinc-800 rounded-3xl p-6 border border-zinc-700">
          <h3 className="text-lg font-bold mb-4">Account Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Telegram ID</span>
              <span className="font-mono">{user?.id || "N/A"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Username</span>
              <span>@{user?.username || "None"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Status</span>
              <span className="text-green-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Verified
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="p-4 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-md flex justify-around items-center">
        <button className="text-blue-500 flex flex-col items-center gap-1">
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-medium">Home</span>
        </button>
        <button className="text-zinc-500 flex flex-col items-center gap-1 hover:text-zinc-300 transition-colors">
          <span className="text-xl">📊</span>
          <span className="text-[10px] font-medium">Markets</span>
        </button>
        <button className="text-zinc-500 flex flex-col items-center gap-1 hover:text-zinc-300 transition-colors">
          <span className="text-xl">👥</span>
          <span className="text-[10px] font-medium">Referrals</span>
        </button>
        <button className="text-zinc-500 flex flex-col items-center gap-1 hover:text-zinc-300 transition-colors">
          <span className="text-xl">⚙️</span>
          <span className="text-[10px] font-medium">Settings</span>
        </button>
      </nav>
    </div>
  );
}
