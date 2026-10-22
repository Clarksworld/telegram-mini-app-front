"use client";

import { useState } from "react";
import axios, { AxiosError } from "axios";
import { useAppStore } from "@/store/useAppStore";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

type NetworkType = "TON" | "BEP20";

export default function DepositPage() {
  const { user, initData } = useAppStore();
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkType>("TON");
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState("");
  const [txId, setTxId] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const currentAddress =
    selectedNetwork === "TON"
      ? user?.tonDepositAddress || "Generating TON Address..."
      : user?.bep20DepositAddress || "Generating BEP-20 Address...";

  const handleCopy = async () => {
    if (!currentAddress || currentAddress.startsWith("Generating")) return;
    try {
      await navigator.clipboard.writeText(currentAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

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
        setStatus("success");
      }
    } catch (err: unknown) {
      console.error("Deposit error:", err);
      let msg = "Failed to submit deposit request.";
      if (axios.isAxiosError(err)) {
        const axiosErr = err as AxiosError<{ error?: string }>;
        msg = axiosErr.response?.data?.error || axiosErr.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setErrorMessage(msg);
      setStatus("error");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white font-sans">
      {/* Header */}
      <header className="p-4 border-b border-zinc-800/80 flex items-center gap-4 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-10">
        <Link
          href="/"
          className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
        >
          ←
        </Link>
        <div>
          <h1 className="text-lg font-bold">Deposit Crypto</h1>
          <p className="text-[11px] text-zinc-400">Direct on-chain custodial deposit</p>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-6 overflow-y-auto">
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

        {/* Deposit Address Box */}
        <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 text-center space-y-4">
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
            {currentAddress}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className={`w-full py-3 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
              copied
                ? "bg-emerald-600 text-white"
                : "bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700"
            }`}
          >
            {copied ? "✓ Copied to Clipboard!" : "📋 Copy Address"}
          </button>

          <p className="text-[11px] text-zinc-500">
            {selectedNetwork === "TON"
              ? "Send only TON or Jettons to this address. Funds will credit automatically upon confirmation."
              : "Send only BEP-20 tokens (e.g. USDT) on BNB Smart Chain. Do not send via other networks."}
          </p>
        </div>

        {/* Manual Confirmation Form */}
        <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 space-y-4">
          <h3 className="text-sm font-bold text-zinc-300">Submit Transaction Hash (Optional)</h3>
          <p className="text-xs text-zinc-400">
            Deposits are tracked automatically, but you can also submit your transaction hash to
            expedite processing.
          </p>

          <form onSubmit={handleDeposit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 ml-1">Deposit Amount</label>
              <input
                type="number"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-blue-500 outline-none transition-all text-sm font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 ml-1">Blockchain Transaction ID (TxHash)</label>
              <input
                type="text"
                required
                value={txId}
                onChange={(e) => setTxId(e.target.value)}
                placeholder="Paste transaction hash here"
                className="w-full p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-blue-500 outline-none transition-all text-sm font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 rounded-xl font-bold text-sm transition-all"
            >
              {status === "loading" ? "Submitting..." : "Confirm Deposit Request"}
            </button>

            {status === "error" && (
              <div className="p-3 bg-red-500/10 border border-red-500/40 text-red-400 rounded-xl text-center text-xs">
                {errorMessage}
              </div>
            )}
          </form>
        </div>
      </main>

      {status === "success" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 text-center max-w-xs w-full space-y-4">
            <div className="text-4xl">✅</div>
            <h2 className="text-xl font-bold">Request Submitted!</h2>
            <p className="text-zinc-400 text-xs">
              Your deposit request has been registered. Your balance will update automatically once
              confirmed on-chain.
            </p>
            <button
              onClick={() => {
                setStatus("idle");
                setAmount("");
                setTxId("");
              }}
              className="w-full py-2.5 bg-blue-600 rounded-xl font-bold text-sm"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
