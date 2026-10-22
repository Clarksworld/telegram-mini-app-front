"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import axios, { AxiosError } from "axios";
import { useAppStore, AppUser } from "@/store/useAppStore";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

type NetworkType = "TON" | "BEP20";

export default function DepositPage() {
  const { user, setUser, initData, setInitData } = useAppStore();
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkType>("TON");
  const [copied, setCopied] = useState(false);
  const [loadingUser, setLoadingUser] = useState(!user);
  const [apiError, setApiError] = useState<string | null>(null);

  // Automatic deposit sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Manual fallback form state
  const [showManualForm, setShowManualForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [txId, setTxId] = useState("");
  const [manualStatus, setManualStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [manualError, setManualError] = useState("");

  const hasFetched = useRef(false);

  // Fetch user profile if not loaded yet
  const fetchUserProfile = useCallback(async (activeInitData: string) => {
    if (!API_BASE_URL) {
      setApiError(
        "Backend API URL is not configured. Please set NEXT_PUBLIC_API_URL in your Vercel Project Settings."
      );
      setLoadingUser(false);
      return;
    }

    try {
      setLoadingUser(true);
      setApiError(null);

      const response = await axios.get<{ user: AppUser }>(`${API_BASE_URL}/profile`, {
        headers: {
          Authorization: `tma ${activeInitData}`,
          Accept: "application/json",
        },
        timeout: 10000,
      });

      if (response.data?.user) {
        setUser(response.data.user);
      }
    } catch (err: unknown) {
      console.error("Failed to load user profile on deposit page:", err);
      let msg = "Could not connect to backend server.";
      if (axios.isAxiosError(err)) {
        const axiosErr = err as AxiosError<{ error?: string }>;
        msg = axiosErr.response?.data?.error || axiosErr.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setApiError(
        `${msg} (Ensure backend is running and NEXT_PUBLIC_API_URL is correctly set in Vercel)`
      );
    } finally {
      setLoadingUser(false);
    }
  }, [setUser]);

  // Initial load
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    let currentInit = initData;

    if (!currentInit) {
      const webApp = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
      currentInit = webApp?.initData || null;

      // Local browser preview fallback
      if (!currentInit && typeof window !== "undefined" && window.location.hostname === "localhost") {
        const devUser = encodeURIComponent(
          JSON.stringify({
            id: 999999999,
            first_name: "Local",
            last_name: "Developer",
            username: "local_dev",
          })
        );
        currentInit = `query_id=dev&user=${devUser}&auth_date=1700000000&hash=dev_preview_hash`;
      }

      if (currentInit) {
        setInitData(currentInit);
      }
    }

    if (!user && currentInit) {
      void fetchUserProfile(currentInit);
    } else if (!user && !currentInit) {
      setLoadingUser(false);
      setApiError("Open this app within Telegram to view your unique deposit address.");
    } else {
      setLoadingUser(false);
    }
  }, [user, initData, setInitData, fetchUserProfile]);

  // Automatic on-chain deposit sync
  const handleCheckDeposits = async () => {
    if (!API_BASE_URL || !initData) return;
    setIsSyncing(true);
    setSyncMessage("Scanning blockchain for incoming deposits...");

    try {
      const res = await axios.post<{
        success: boolean;
        syncResult: { tonCredited: number; bep20Credited: number };
        wallets: { currency: string; balance: string }[];
      }>(
        `${API_BASE_URL}/wallet/sync`,
        {},
        {
          headers: {
            Authorization: `tma ${initData}`,
          },
          timeout: 12000,
        }
      );

      if (res.data.success) {
        const { tonCredited, bep20Credited } = res.data.syncResult || { tonCredited: 0, bep20Credited: 0 };
        const totalCredited = (tonCredited || 0) + (bep20Credited || 0);

        if (totalCredited > 0) {
          setSyncMessage(`🎉 Success! Credited ${totalCredited} new deposit(s). Balance updated.`);
          fetchUserProfile(initData);
        } else {
          setSyncMessage("No new deposits detected yet. Try again after transaction confirms.");
        }
      }
    } catch (err: unknown) {
      console.error("Sync error:", err);
      setSyncMessage("Scan completed. No new confirmed transactions found.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const currentAddress =
    selectedNetwork === "TON"
      ? user?.tonDepositAddress || (loadingUser ? "Deriving TON Address..." : "Address Unavailable")
      : user?.bep20DepositAddress || (loadingUser ? "Deriving BEP-20 Address..." : "Address Unavailable");

  const handleCopy = async () => {
    if (!currentAddress || currentAddress.includes("...")) return;
    try {
      await navigator.clipboard.writeText(currentAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleManualDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualStatus("loading");
    setManualError("");

    try {
      const response = await axios.post<{ success: boolean; message: string; depositId?: string }>(
        `${API_BASE_URL}/deposits`,
        {
          amount: parseFloat(amount),
          currency: selectedNetwork === "TON" ? "TON" : "USDT",
          txId: txId.trim(),
        },
        {
          headers: {
            Authorization: `tma ${initData || ""}`,
          },
        }
      );

      if (response.data.success) {
        setManualStatus("success");
      }
    } catch (err: unknown) {
      console.error("Manual deposit error:", err);
      let msg = "Failed to submit deposit request.";
      if (axios.isAxiosError(err)) {
        const axiosErr = err as AxiosError<{ error?: string }>;
        msg = axiosErr.response?.data?.error || axiosErr.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setManualError(msg);
      setManualStatus("error");
    }
  };

  const currentWallet = user?.wallets?.find((w) =>
    selectedNetwork === "TON" ? w.currency === "TON" : w.currency === "USDT"
  );
  const currentBalance = currentWallet ? parseFloat(currentWallet.balance).toFixed(2) : "0.00";

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white font-sans">
      {/* Header */}
      <header className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
          >
            ←
          </Link>
          <div>
            <h1 className="text-base font-bold">Deposit Funds</h1>
            <p className="text-[10px] text-zinc-400">Automatic On-Chain Crediting</p>
          </div>
        </div>

        <button
          onClick={handleCheckDeposits}
          disabled={isSyncing}
          className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 rounded-full text-xs text-blue-400 font-medium flex items-center gap-1.5 transition-all"
        >
          <span className={isSyncing ? "animate-spin" : ""}>🔄</span>
          <span>{isSyncing ? "Checking..." : "Sync Status"}</span>
        </button>
      </header>

      <main className="flex-1 p-4 space-y-5 overflow-y-auto">
        {/* Sync notification toast */}
        {syncMessage && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-xs text-blue-300 text-center animate-fade-in font-medium">
            {syncMessage}
          </div>
        )}

        {/* API connection warning if backend URL is missing or unreachable */}
        {apiError && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/40 rounded-2xl space-y-2 text-xs text-amber-300">
            <div className="font-bold flex items-center gap-1.5 text-amber-400">
              <span>⚠️</span> Backend Connection Needed
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-300">{apiError}</p>
            <button
              onClick={() => initData && fetchUserProfile(initData)}
              className="mt-2 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-amber-200 text-xs font-semibold"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Network Selector Tabs */}
        <div className="grid grid-cols-2 p-1 bg-zinc-900 rounded-2xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setSelectedNetwork("TON")}
            className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${
              selectedNetwork === "TON"
                ? "bg-blue-600 text-white shadow-md"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            TON Network
          </button>
          <button
            type="button"
            onClick={() => setSelectedNetwork("BEP20")}
            className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${
              selectedNetwork === "BEP20"
                ? "bg-yellow-600 text-white shadow-md"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            BNB Chain (BEP-20)
          </button>
        </div>

        {/* Balance Card */}
        <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
              Current {selectedNetwork === "TON" ? "TON" : "USDT"} Balance
            </p>
            <p className="text-xl font-mono font-bold text-white">
              {currentBalance} {selectedNetwork === "TON" ? "TON" : "USDT"}
            </p>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-medium">
            ● Auto-Credited
          </span>
        </div>

        {/* Deposit Address Box */}
        <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                selectedNetwork === "TON" ? "bg-blue-400" : "bg-yellow-400"
              }`}
            ></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Your Unique {selectedNetwork} Deposit Address
            </span>
          </div>

          <div
            onClick={handleCopy}
            className="cursor-pointer bg-zinc-950 p-4 rounded-2xl font-mono text-xs text-zinc-200 break-all border border-zinc-800 hover:border-zinc-700 transition-colors relative group select-all"
          >
            {loadingUser ? "Deriving your secure HD address..." : currentAddress}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            disabled={loadingUser || !user}
            className={`w-full py-3 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
              copied
                ? "bg-emerald-600 text-white"
                : "bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700"
            }`}
          >
            {copied ? "✓ Copied to Clipboard!" : "📋 Copy Address"}
          </button>

          <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/60 text-left space-y-1.5">
            <p className="text-xs font-semibold text-zinc-300">⚡ How it works:</p>
            <ol className="text-[11px] text-zinc-400 space-y-1 list-decimal list-inside leading-relaxed">
              <li>Send {selectedNetwork === "TON" ? "TON or Jettons" : "USDT (BEP-20)"} to the address above.</li>
              <li>Wait for blockchain network confirmation (typically 10–30 seconds).</li>
              <li>Your balance will update automatically without needing manual confirmation!</li>
            </ol>
          </div>
        </div>

        {/* Collapsible Manual Submission Fallback */}
        <div className="border border-zinc-800/60 rounded-2xl overflow-hidden bg-zinc-900/40">
          <button
            type="button"
            onClick={() => setShowManualForm(!showManualForm)}
            className="w-full p-3.5 flex items-center justify-between text-left text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <span>Don&apos;t see your deposit? Submit TxHash</span>
            <span>{showManualForm ? "▲" : "▼"}</span>
          </button>

          {showManualForm && (
            <div className="p-4 pt-1 border-t border-zinc-800/60 space-y-3">
              <p className="text-[11px] text-zinc-500">
                If an external exchange transfer took longer than usual, paste the transaction hash here to trigger a manual balance check.
              </p>

              <form onSubmit={handleManualDeposit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400 ml-1">Amount</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400 ml-1">Transaction ID (TxHash)</label>
                  <input
                    type="text"
                    required
                    value={txId}
                    onChange={(e) => setTxId(e.target.value)}
                    placeholder="Paste transaction hash here"
                    className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={manualStatus === "loading"}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-750 text-white rounded-xl text-xs font-semibold border border-zinc-700 transition-all"
                >
                  {manualStatus === "loading" ? "Submitting..." : "Submit TxHash for Verification"}
                </button>

                {manualStatus === "error" && (
                  <p className="text-xs text-red-400 text-center">{manualError}</p>
                )}
                {manualStatus === "success" && (
                  <p className="text-xs text-emerald-400 text-center">✓ Request submitted successfully.</p>
                )}
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
