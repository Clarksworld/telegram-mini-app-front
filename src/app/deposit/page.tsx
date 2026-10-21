"use client";

import { useState } from "react";
import axios from "axios";
import { useAppStore } from "@/store/useAppStore";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function DepositPage() {
  const { user, initData } = useAppStore();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USDT");
  const [txId, setTxId] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await axios.post(`${API_BASE_URL}/deposits`, {
        amount,
        currency,
        txId,
      }, {
        headers: {
          Authorization: `tma ${initData}`,
        },
      });

      if (response.data.success) {
        setStatus("success");
      }
    } catch (err: any) {
      console.error("Deposit error:", err);
      setErrorMessage(err.response?.data?.error || "Failed to submit deposit request.");
      setStatus("error");
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 text-white font-sans">
      {/* Header */}
      <header className="p-4 border-b border-zinc-800 flex items-center gap-4 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
        <Link href="/" className="text-2xl">←</Link>
        <h1 className="text-xl font-bold">Deposit Funds</h1>
      </header>

      <main className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Wallet Address Card */}
        <div className="bg-zinc-800 p-6 rounded-3xl border border-zinc-700 text-center space-y-4">
          <p className="text-zinc-400 text-sm">Send funds to this address:</p>
          <div className="bg-black p-4 rounded-2xl font-mono text-sm break-all border border-zinc-700 select-all">
            T_YOUR_WALLET_ADDRESS_HERE_123456789
          </div>
          <p className="text-xs text-zinc-500 italic">
            Make sure to send only {currency} to this address.
          </p>
        </div>

        {/* Deposit Form */}
        <form onSubmit={handleDeposit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-zinc-400 ml-1">Amount</label>
            <input
              type="number"
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400 ml-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
            >
              <option value="USDT">USDT (Tether)</option>
              <option value="BTC">BTC (Bitcoin)</option>
              <option value="ETH">ETH (Ethereum)</option>
              <option value="TON">TON (Toncoin)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400 ml-1">Transaction ID (TxID)</label>
            <input
              type="text"
              required
              value={txId}
              onChange={(e) => setTxId(e.target.value)}
              placeholder="Paste blockchain hash here"
              className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 rounded-2xl font-bold text-lg transition-all mt-4"
          >
            {status === "loading" ? "Submitting..." : "Confirm Deposit"}
          </button>

          {status === "error" && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 text-red-500 rounded-2xl text-center text-sm">
              {errorMessage}
            </div>
          )}
        </form>
      </main>

      {status === "success" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <div className="bg-zinc-800 p-8 rounded-3xl border border-zinc-700 text-center max-w-xs w-full space-y-4">
            <div className="text-5xl mb-2">✅</div>
            <h2 className="text-2xl font-bold">Submitted!</h2>
            <p className="text-zinc-400 text-sm">
              Your deposit request has been sent. Our team will verify the transaction and update your balance shortly.
            </p>
            <button
              onClick={() => setStatus("idle")}
              className="w-full py-3 bg-blue-600 rounded-xl font-bold"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
