"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAppStore } from "@/store/useAppStore";
import BottomNav from "@/components/BottomNav";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

const POPULAR_BANKS = [
  "Moniepoint MFB",
  "OPay",
  "PalmPay",
  "Kuda Bank",
  "Access Bank",
  "GTBank (Guaranty Trust)",
  "Zenith Bank",
  "United Bank for Africa (UBA)",
  "First Bank of Nigeria",
  "Fidelity Bank",
  "Stanbic IBTC",
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, initData, updateBankDetails } = useAppStore();

  const [bankName, setBankName] = useState(user?.bankName || "");
  const [accountNumber, setAccountNumber] = useState(user?.accountNumber || "");
  const [accountName, setAccountName] = useState(user?.accountName || "");

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (user.bankName && !bankName) setBankName(user.bankName);
      if (user.accountNumber && !accountNumber) setAccountNumber(user.accountNumber);
      if (user.accountName && !accountName) setAccountName(user.accountName);
    }
  }, [user]);

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      setSaveError("Please fill in all bank details.");
      return;
    }

    if (accountNumber.trim().length < 10) {
      setSaveError("Account number must be 10 digits.");
      return;
    }

    setSaving(true);
    try {
      const authHeader = initData ? `tma ${initData}` : "tma test_user=123456789";
      const res = await axios.post(
        `${API_BASE_URL}/settings/bank-details`,
        {
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim(),
        },
        {
          headers: {
            Authorization: authHeader,
          },
          timeout: 8000,
        }
      );

      if (res.data?.success) {
        updateBankDetails({
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim(),
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setSaveError(res.data?.error || "Failed to save bank details.");
      }
    } catch (err: any) {
      setSaveError(
        err.response?.data?.error || err.message || "Failed to communicate with server."
      );
    } finally {
      setSaving(false);
    }
  };

  const isConfigured = !!(user?.bankName && user?.accountNumber && user?.accountName);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white font-sans">
      {/* Header */}
      <header className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm hover:bg-zinc-700 transition-colors"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Settings</h1>
            <p className="text-[10px] text-zinc-400">Manage Account & Payouts</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-5 overflow-y-auto max-w-lg mx-auto w-full">
        {/* User Profile Card */}
        <div className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-lg font-bold shadow-md">
              {user?.firstName?.charAt(0) || "U"}
            </div>
            <div>
              <h2 className="font-bold text-white text-base">
                {user?.firstName} {user?.lastName || ""}
              </h2>
              <p className="text-xs text-zinc-400">@{user?.username || "no_username"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-zinc-800/60">
            <div>
              <span className="text-zinc-500">Telegram ID</span>
              <p className="font-mono text-zinc-300 font-medium">{user?.telegramId || "N/A"}</p>
            </div>
            <div>
              <span className="text-zinc-500">HD Wallet Index</span>
              <p className="font-mono text-zinc-300 font-medium">#{user?.walletIndex ?? 1}</p>
            </div>
          </div>
        </div>

        {/* Bank Details Setup Card */}
        <div className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏦</span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Payout Bank Details
              </h3>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                isConfigured
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-400 border-amber-500/30"
              }`}
            >
              {isConfigured ? "✓ Configured" : "Action Needed"}
            </span>
          </div>

          <p className="text-xs text-zinc-400">
            These Nigerian bank account details will be used to automatically credit you when you
            sell crypto on the Trade tab.
          </p>

          <form onSubmit={handleSaveBank} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400 ml-1 font-medium">Bank Name</label>
              <input
                type="text"
                list="bank-suggestions"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Moniepoint, OPay, GTBank"
                className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs outline-none focus:border-blue-500 transition-colors"
              />
              <datalist id="bank-suggestions">
                {POPULAR_BANKS.map((bank) => (
                  <option key={bank} value={bank} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400 ml-1 font-medium">Account Number</label>
              <input
                type="text"
                required
                maxLength={10}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="10-digit NUBAN number"
                className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400 ml-1 font-medium">Account Name</label>
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Full Name as registered on bank account"
                className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {saveError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 text-center">
                {saveError}
              </div>
            )}

            {saveSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 text-center font-medium">
                ✓ Bank details saved successfully!
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? "Saving Details..." : "Save Bank Details"}
            </button>
          </form>
        </div>

        {/* Trade Shortcut */}
        <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-white">Ready to trade?</p>
            <p className="text-[11px] text-zinc-400">Buy or sell crypto at live CMC rates</p>
          </div>
          <button
            onClick={() => router.push("/trade")}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Go to Trade 📈
          </button>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
