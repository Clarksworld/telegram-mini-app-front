"use client";

import { useEffect, useState } from "react";
import axios, { AxiosError } from "axios";
import { useAppStore, AppUser } from "@/store/useAppStore";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

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
        const webApp = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;

        let initData = webApp?.initData;

        // If local development outside Telegram, provide fallback preview initData
        if (!initData || initData.trim() === "") {
          if (typeof window !== "undefined" && window.location.hostname === "localhost") {
            const devUser = encodeURIComponent(
              JSON.stringify({
                id: 999999999,
                first_name: "Local",
                last_name: "Developer",
                username: "local_dev",
              })
            );
            initData = `query_id=dev&user=${devUser}&auth_date=1700000000&hash=dev_preview_hash`;
          } else {
            setError("No initialization data found. This app must be opened inside Telegram.");
            setLoading(false);
            return;
          }
        }

        setInitData(initData);
        setLoadingStep("Fetching your wallet...");

        const response = await axios.get<{ user: AppUser; message: string }>(
          `${API_BASE_URL}/profile`,
          {
            headers: {
              Authorization: `tma ${initData}`,
              Accept: "application/json",
            },
            timeout: 8000,
          }
        );

        if (response.data && response.data.user) {
          setUser(response.data.user);
          setAuth(true);
        } else {
          throw new Error("Backend responded successfully but user data is missing.");
        }
      } catch (err: unknown) {
        console.error("Auth error:", err);
        let message = "Failed to connect to the server.";
        if (axios.isAxiosError(err)) {
          const axiosErr = err as AxiosError<{ error?: string }>;
          message = axiosErr.response?.data?.error || axiosErr.message;
        } else if (err instanceof Error) {
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
      <div className="flex h-full items-center justify-center bg-zinc-950 text-white min-h-screen">
        <div className="text-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="text-lg font-medium text-zinc-300">{loadingStep}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-950 text-white p-6 min-h-screen">
        <div className="text-center max-w-sm">
          <div className="mb-4 text-red-500 text-5xl">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Connection Status</h2>
          <p className="text-zinc-400 mb-6 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-blue-600 rounded-full font-medium hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Calculate total balance from wallets
  const usdtWallet = user?.wallets?.find((w) => w.currency === "USDT");
  const tonWallet = user?.wallets?.find((w) => w.currency === "TON");

  const totalUsdt = usdtWallet ? parseFloat(usdtWallet.balance).toFixed(2) : "0.00";
  const totalTon = tonWallet ? parseFloat(tonWallet.balance).toFixed(2) : "0.00";

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white font-sans">
      {/* Header */}
      <header className="p-4 border-b border-zinc-800/80 flex justify-between items-center bg-zinc-900/60 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            TMA Trader
          </h1>
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">
            Custodial HD Multi-Chain
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 border border-indigo-400/30 flex items-center justify-center text-sm font-bold shadow-md">
            {user?.firstName?.charAt(0) || "U"}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Welcome Card */}
        <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-blue-900 p-6 rounded-3xl shadow-xl relative overflow-hidden border border-indigo-500/20">
          <div className="relative z-10">
            <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">
              Welcome back,
            </p>
            <h2 className="text-2xl font-bold text-white mb-4">
              {user?.firstName} {user?.lastName || ""}
            </h2>
            <div className="grid grid-cols-2 gap-3 bg-black/25 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div>
                <p className="text-[11px] text-indigo-200/70 font-medium">USDT Balance</p>
                <p className="text-2xl font-mono font-bold text-white">${totalUsdt}</p>
              </div>
              <div>
                <p className="text-[11px] text-indigo-200/70 font-medium">TON Balance</p>
                <p className="text-2xl font-mono font-bold text-white">{totalTon} TON</p>
              </div>
            </div>
          </div>
          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push("/deposit")}
            className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-850 transition-all text-left group shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform text-lg">
              💰
            </div>
            <p className="font-semibold text-white">Deposit</p>
            <p className="text-xs text-zinc-400">View unique deposit addresses</p>
          </button>

          <button onClick={() => router.push("/trade")} className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-850 transition-all text-left group shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform text-lg">
              📈
            </div>
            <p className="font-semibold text-white">Trade</p>
            <p className="text-xs text-zinc-400">Buy & sell crypto</p>
          </button>
        </div>

        {/* Assigned Deposit Wallets Card */}
        <div className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
              Assigned Deposit Addresses
            </h3>
            <span className="text-[10px] font-mono bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
              HD Account #{user?.walletIndex ?? 1}
            </span>
          </div>

          {/* TON Address Preview */}
          <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span> TON Network
              </span>
              <span className="text-[10px] text-zinc-500">v4r2</span>
            </div>
            <p className="font-mono text-xs text-zinc-300 break-all select-all">
              {user?.tonDepositAddress || "Generating..."}
            </p>
          </div>

          {/* BEP-20 Address Preview */}
          <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-yellow-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-400"></span> BNB Smart Chain (BEP-20)
              </span>
              <span className="text-[10px] text-zinc-500">EVM</span>
            </div>
            <p className="font-mono text-xs text-zinc-300 break-all select-all">
              {user?.bep20DepositAddress || "Generating..."}
            </p>
          </div>
        </div>

        {/* Account Details */}
        <div className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3">
            Account Details
          </h3>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Telegram ID</span>
              <span className="font-mono text-zinc-200">{user?.telegramId || "N/A"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Username</span>
              <span className="text-zinc-200">@{user?.username || "None"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Wallet Mode</span>
              <span className="text-indigo-400 font-medium">Custodial HD</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Status</span>
              <span className="text-emerald-400 flex items-center gap-1.5 text-xs font-medium">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> Active
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
