"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAppStore } from "@/store/useAppStore";
import BottomNav from "@/components/BottomNav";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

type TokenType = "USDT" | "TON";
type TradeTab = "sell" | "buy";

interface TokenRate {
  symbol: string;
  name: string;
  priceUsd: number;
  rateNgn: number;
}

interface RatesData {
  rates: Record<string, TokenRate>;
  usdNgnRate: number;
  source: string;
}

interface PlatformAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
  instructions: string;
}

export default function TradePage() {
  const router = useRouter();
  const { user, initData, updateWalletBalance, updateBankDetails } = useAppStore();

  const [activeTab, setActiveTab] = useState<TradeTab>("sell");
  const [selectedToken, setSelectedToken] = useState<TokenType>("USDT");
  const [amount, setAmount] = useState<string>("");

  // Rates state
  const [ratesData, setRatesData] = useState<RatesData | null>(null);
  const [loadingRates, setLoadingRates] = useState<boolean>(true);

  // Platform bank details for buy
  const [platformAccount, setPlatformAccount] = useState<PlatformAccount>({
    bankName: "Moniepoint MFB",
    accountNumber: "8203948192",
    accountName: "Ogohmi Trading Platform",
    instructions: "Transfer exact NGN amount using your reference as remark.",
  });

  // Sell Flow Steps: 1: Input, 2: Bank Review, 3: Confirmation, 4: Complete
  const [sellStep, setSellStep] = useState<number>(1);
  const [selling, setSelling] = useState<boolean>(false);
  const [sellResult, setSellResult] = useState<{
    success: boolean;
    reference?: string;
    cryptoAmount?: number;
    nairaAmount?: number;
    token?: string;
    error?: string;
  } | null>(null);

  // Buy Flow Steps: 1: Input, 2: Payment Details, 3: Complete
  const [buyStep, setBuyStep] = useState<number>(1);
  const [buying, setBuying] = useState<boolean>(false);
  const [buyReference, setBuyReference] = useState<string>("");
  const [buyResult, setBuyResult] = useState<{
    success: boolean;
    reference?: string;
    cryptoAmount?: number;
    nairaAmount?: number;
    token?: string;
    error?: string;
  } | null>(null);

  // Copy feedback state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fetch rates & platform bank account
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingRates(true);
        const [ratesRes, platformRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/trade/rates`, { timeout: 6000 }),
          axios.get(`${API_BASE_URL}/trade/platform-account`, { timeout: 6000 }),
        ]);

        if (ratesRes.status === "fulfilled" && ratesRes.value.data?.rates) {
          setRatesData(ratesRes.value.data);
        } else {
          // Default fallback rates
          setRatesData({
            rates: {
              USDT: { symbol: "USDT", name: "Tether USD", priceUsd: 1.0, rateNgn: 1680 },
              TON: { symbol: "TON", name: "Toncoin", priceUsd: 5.2, rateNgn: 8736 },
            },
            usdNgnRate: 1680,
            source: "default_fallback",
          });
        }

        if (platformRes.status === "fulfilled" && platformRes.value.data?.account) {
          setPlatformAccount(platformRes.value.data.account);
        }
      } catch (err) {
        console.error("Error loading trade data:", err);
      } finally {
        setLoadingRates(false);
      }
    };

    fetchData();
  }, []);

  // Set initial buy reference code
  useEffect(() => {
    if (!buyReference) {
      const ref = `OGH-${Math.floor(100000 + Math.random() * 900000)}`;
      setBuyReference(ref);
    }
  }, [buyReference]);

  // Current token rate in NGN
  const currentRateNgn =
    ratesData?.rates[selectedToken]?.rateNgn ||
    (selectedToken === "USDT" ? 1680 : 8500);

  // User wallet balance for selected token
  const userWallet = user?.wallets?.find((w) => w.currency === selectedToken);
  const availableBalance = userWallet ? parseFloat(userWallet.balance) : 0;

  // Numerical amount and Naira calculation
  const numAmount = parseFloat(amount) || 0;
  const nairaEquivalent = Math.round(numAmount * currentRateNgn);

  // Helper copy function
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Handle Sell Submission
  const handleExecuteSell = async () => {
    if (!user?.bankName || !user?.accountNumber || !user?.accountName) {
      router.push("/settings");
      return;
    }

    setSelling(true);
    try {
      const authHeader = initData ? `tma ${initData}` : "tma test_user=123456789";
      const res = await axios.post(
        `${API_BASE_URL}/trade/sell`,
        {
          token: selectedToken,
          amount: numAmount,
          bankName: user.bankName,
          accountNumber: user.accountNumber,
          accountName: user.accountName,
        },
        {
          headers: { Authorization: authHeader },
          timeout: 10000,
        }
      );

      if (res.data?.success) {
        const order = res.data.order;
        updateWalletBalance(selectedToken, order.newBalance);
        setSellResult({
          success: true,
          reference: order.reference,
          cryptoAmount: order.cryptoAmount,
          nairaAmount: order.nairaAmount,
          token: order.token,
        });
        setSellStep(4);
      } else {
        setSellResult({
          success: false,
          error: res.data?.error || "Sell transaction failed.",
        });
        setSellStep(4);
      }
    } catch (err: any) {
      setSellResult({
        success: false,
        error:
          err.response?.data?.error ||
          err.message ||
          "Failed to process sell transaction.",
      });
      setSellStep(4);
    } finally {
      setSelling(false);
    }
  };

  // Handle Buy Submission (Credits user wallet)
  const handleExecuteBuy = async () => {
    setBuying(true);
    try {
      const authHeader = initData ? `tma ${initData}` : "tma test_user=123456789";
      const res = await axios.post(
        `${API_BASE_URL}/trade/buy`,
        {
          token: selectedToken,
          amount: numAmount,
        },
        {
          headers: { Authorization: authHeader },
          timeout: 10000,
        }
      );

      if (res.data?.success) {
        const order = res.data.order;
        updateWalletBalance(selectedToken, order.newBalance);
        setBuyResult({
          success: true,
          reference: order.reference,
          cryptoAmount: order.cryptoAmount,
          nairaAmount: order.nairaAmount,
          token: order.token,
        });
        setBuyStep(3);
      } else {
        setBuyResult({
          success: false,
          error: res.data?.error || "Buy confirmation failed.",
        });
        setBuyStep(3);
      }
    } catch (err: any) {
      setBuyResult({
        success: false,
        error:
          err.response?.data?.error ||
          err.message ||
          "Failed to process buy confirmation.",
      });
      setBuyStep(3);
    } finally {
      setBuying(false);
    }
  };

  // Reset Form
  const resetForm = () => {
    setAmount("");
    setSellStep(1);
    setBuyStep(1);
    setSellResult(null);
    setBuyResult(null);
    setBuyReference(`OGH-${Math.floor(100000 + Math.random() * 900000)}`);
  };

  const isBankConfigured = !!(
    user?.bankName &&
    user?.accountNumber &&
    user?.accountName
  );

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
            <h1 className="text-lg font-bold text-white">Trade</h1>
            <p className="text-[10px] text-zinc-400">Buy & Sell with Instant Naira</p>
          </div>
        </div>

        {/* Live CMC Rate Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-[10px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-zinc-300 font-medium">
            {loadingRates ? "Fetching..." : "Live CMC"}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-5 overflow-y-auto max-w-lg mx-auto w-full">
        {/* Segmented Switcher: Sell / Buy */}
        <div className="grid grid-cols-2 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <button
            onClick={() => {
              setActiveTab("sell");
              resetForm();
            }}
            className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "sell"
                ? "bg-rose-600 text-white shadow-md shadow-rose-950"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <span>📉</span> Sell Crypto
          </button>

          <button
            onClick={() => {
              setActiveTab("buy");
              resetForm();
            }}
            className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "buy"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <span>📈</span> Buy Crypto
          </button>
        </div>

        {/* ============================================================== */}
        {/* SELL FLOW                                                      */}
        {/* ============================================================== */}
        {activeTab === "sell" && (
          <div className="space-y-4">
            {/* Step Indicator */}
            {sellStep < 4 && (
              <div className="flex items-center justify-between px-2 text-[11px] text-zinc-400">
                <span className={sellStep >= 1 ? "text-rose-400 font-bold" : ""}>
                  1. Amount
                </span>
                <span>→</span>
                <span className={sellStep >= 2 ? "text-rose-400 font-bold" : ""}>
                  2. Bank Details
                </span>
                <span>→</span>
                <span className={sellStep >= 3 ? "text-rose-400 font-bold" : ""}>
                  3. Review
                </span>
              </div>
            )}

            {/* STEP 1: Enter Sell Amount */}
            {sellStep === 1 && (
              <div className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800 space-y-5">
                {/* Token Selector */}
                <div>
                  <label className="text-xs text-zinc-400 block mb-2 font-medium">
                    Select Token to Sell
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedToken("USDT")}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                        selectedToken === "USDT"
                          ? "border-emerald-500 bg-emerald-500/10 text-white"
                          : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        ₮
                      </div>
                      <div>
                        <p className="font-bold text-xs">USDT</p>
                        <p className="text-[10px] text-zinc-500">BEP-20</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedToken("TON")}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                        selectedToken === "TON"
                          ? "border-blue-500 bg-blue-500/10 text-white"
                          : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                        💎
                      </div>
                      <div>
                        <p className="font-bold text-xs">TON</p>
                        <p className="text-[10px] text-zinc-500">TON Network</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">Amount to Sell</span>
                    <span className="text-zinc-400">
                      Balance:{" "}
                      <span className="text-white font-mono font-semibold">
                        {availableBalance.toFixed(4)} {selectedToken}
                      </span>
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full p-4 pr-16 bg-zinc-950 border border-zinc-800 rounded-2xl text-xl font-mono text-white outline-none focus:border-rose-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setAmount(availableBalance.toString())}
                      className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-rose-400 text-xs font-bold rounded-lg transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Live Naira Equivalent Display */}
                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400">You will receive</span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Rate: 1 {selectedToken} = ₦{currentRateNgn.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-emerald-400">
                    ₦{nairaEquivalent.toLocaleString()}
                  </p>
                </div>

                {/* Balance validation error */}
                {numAmount > availableBalance && (
                  <p className="text-xs text-rose-400 text-center font-medium">
                    ⚠️ Insufficient balance. You have {availableBalance.toFixed(4)}{" "}
                    {selectedToken}.
                  </p>
                )}

                <button
                  type="button"
                  disabled={numAmount <= 0 || numAmount > availableBalance}
                  onClick={() => setSellStep(2)}
                  className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-rose-950 active:scale-[0.98] transition-all disabled:opacity-40"
                >
                  Continue to Bank Details →
                </button>
              </div>
            )}

            {/* STEP 2: Bank Details Selection / Review */}
            {sellStep === 2 && (
              <div className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white">Payout Bank Account</h3>
                  <button
                    onClick={() => router.push("/settings")}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    Edit in Settings ⚙️
                  </button>
                </div>

                {isBankConfigured ? (
                  <div className="p-4 bg-zinc-950 rounded-2xl border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Saved
                        Payout Account
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">Verified</span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-lg font-bold text-white">{user?.bankName}</p>
                      <p className="text-sm font-mono text-zinc-300">
                        {user?.accountNumber}
                      </p>
                      <p className="text-xs text-zinc-400 uppercase tracking-wide">
                        {user?.accountName}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3 text-center">
                    <span className="text-2xl">🏦</span>
                    <p className="text-xs font-semibold text-amber-300">
                      No Bank Account Set Up Yet
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Please configure your Nigerian bank account details in Settings so we
                      know where to transfer your Naira.
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push("/settings")}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-bold transition-all"
                    >
                      Go to Settings to Add Bank
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSellStep(1)}
                    className="py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    disabled={!isBankConfigured}
                    onClick={() => setSellStep(3)}
                    className="py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-40"
                  >
                    Review Order →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Sell Confirmation Screen */}
            {sellStep === 3 && (
              <div className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800 space-y-5">
                <div className="text-center space-y-1">
                  <span className="text-3xl">📝</span>
                  <h3 className="font-bold text-base text-white">Confirm Sell Order</h3>
                  <p className="text-xs text-zinc-400">
                    Review the details before finalizing your sell.
                  </p>
                </div>

                {/* Summary Breakdown Card */}
                <div className="bg-zinc-950 rounded-2xl p-4 border border-zinc-800 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Selling</span>
                    <span className="font-mono font-bold text-white">
                      {numAmount} {selectedToken}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-zinc-400">Exchange Rate (CMC)</span>
                    <span className="font-mono text-zinc-300">
                      1 {selectedToken} = ₦{currentRateNgn.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-zinc-400">Service Fee</span>
                    <span className="font-mono text-emerald-400">₦0.00 (Free)</span>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 flex justify-between items-center">
                    <span className="text-zinc-300 font-semibold">Total Payout</span>
                    <span className="text-lg font-mono font-bold text-emerald-400">
                      ₦{nairaEquivalent.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Destination Bank Card */}
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-1 text-xs">
                  <span className="text-[11px] text-zinc-500">Destination Account</span>
                  <p className="font-semibold text-zinc-200">
                    {user?.bankName} - {user?.accountNumber}
                  </p>
                  <p className="text-[11px] text-zinc-400 uppercase">{user?.accountName}</p>
                </div>

                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[11px] text-rose-300 text-center">
                  ⚠️ {numAmount} {selectedToken} will be deducted from your wallet upon
                  clicking Confirm.
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSellStep(2)}
                    className="py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition-all"
                  >
                    ← Edit
                  </button>
                  <button
                    type="button"
                    disabled={selling}
                    onClick={handleExecuteSell}
                    className="py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-950 transition-all disabled:opacity-50"
                  >
                    {selling ? "Processing..." : "Confirm & Sell"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Sell Complete Screen */}
            {sellStep === 4 && sellResult && (
              <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 text-center space-y-4">
                {sellResult.success ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl mx-auto border border-emerald-500/30">
                      ✓
                    </div>
                    <h3 className="text-lg font-bold text-white">Sell Order Complete!</h3>
                    <p className="text-xs text-zinc-400">
                      Your wallet has been deducted by{" "}
                      <span className="font-bold text-white">
                        {sellResult.cryptoAmount} {sellResult.token}
                      </span>
                      . Naira payout of{" "}
                      <span className="font-bold text-emerald-400">
                        ₦{sellResult.nairaAmount?.toLocaleString()}
                      </span>{" "}
                      is processing to your bank account.
                    </p>

                    <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-400 text-left space-y-1">
                      <div className="flex justify-between">
                        <span>Reference</span>
                        <span className="text-zinc-200">{sellResult.reference}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status</span>
                        <span className="text-emerald-400 font-semibold">Processing Payout</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={resetForm}
                        className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl transition-all"
                      >
                        Trade Again
                      </button>
                      <button
                        onClick={() => router.push("/")}
                        className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all"
                      >
                        Go to Home
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-3xl mx-auto border border-rose-500/30">
                      ✕
                    </div>
                    <h3 className="text-lg font-bold text-white">Sell Failed</h3>
                    <p className="text-xs text-rose-400">
                      {sellResult.error || "An unexpected error occurred."}
                    </p>
                    <button
                      onClick={() => setSellStep(1)}
                      className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl transition-all"
                    >
                      Try Again
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* BUY FLOW                                                       */}
        {/* ============================================================== */}
        {activeTab === "buy" && (
          <div className="space-y-4">
            {/* Step Indicator */}
            {buyStep < 3 && (
              <div className="flex items-center justify-between px-2 text-[11px] text-zinc-400">
                <span className={buyStep >= 1 ? "text-emerald-400 font-bold" : ""}>
                  1. Amount
                </span>
                <span>→</span>
                <span className={buyStep >= 2 ? "text-emerald-400 font-bold" : ""}>
                  2. Payment Details
                </span>
                <span>→</span>
                <span className={buyStep >= 3 ? "text-emerald-400 font-bold" : ""}>
                  3. Funded
                </span>
              </div>
            )}

            {/* STEP 1: Enter Buy Amount */}
            {buyStep === 1 && (
              <div className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800 space-y-5">
                {/* Token Selector */}
                <div>
                  <label className="text-xs text-zinc-400 block mb-2 font-medium">
                    Select Token to Buy
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedToken("USDT")}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                        selectedToken === "USDT"
                          ? "border-emerald-500 bg-emerald-500/10 text-white"
                          : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        ₮
                      </div>
                      <div>
                        <p className="font-bold text-xs">USDT</p>
                        <p className="text-[10px] text-zinc-500">BEP-20</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedToken("TON")}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                        selectedToken === "TON"
                          ? "border-blue-500 bg-blue-500/10 text-white"
                          : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                        💎
                      </div>
                      <div>
                        <p className="font-bold text-xs">TON</p>
                        <p className="text-[10px] text-zinc-500">TON Network</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Amount to Buy Input */}
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400 font-medium">
                    Enter Amount of {selectedToken} to Buy
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-xl font-mono text-white outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Live Naira Equivalent Cost */}
                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Total to Pay (Naira)</span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Rate: 1 {selectedToken} = ₦{currentRateNgn.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-emerald-400">
                    ₦{nairaEquivalent.toLocaleString()}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={numAmount <= 0}
                  onClick={() => setBuyStep(2)}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-emerald-950 active:scale-[0.98] transition-all disabled:opacity-40"
                >
                  Proceed to Payment Details →
                </button>
              </div>
            )}

            {/* STEP 2: Buy Summary & Platform Bank Account */}
            {buyStep === 2 && (
              <div className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800 space-y-5">
                <div className="text-center space-y-1">
                  <h3 className="font-bold text-base text-white">Make Bank Transfer</h3>
                  <p className="text-xs text-zinc-400">
                    Transfer exactly{" "}
                    <span className="text-emerald-400 font-bold font-mono">
                      ₦{nairaEquivalent.toLocaleString()}
                    </span>{" "}
                    to receive {numAmount} {selectedToken}.
                  </p>
                </div>

                {/* Platform Bank Details Card */}
                <div className="bg-zinc-950 rounded-2xl p-4 border border-emerald-500/30 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                    <span className="text-zinc-400">Platform Bank</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{platformAccount.bankName}</span>
                      <button
                        onClick={() => handleCopy(platformAccount.bankName, "bankName")}
                        className="text-[10px] text-blue-400 hover:text-blue-300"
                      >
                        {copiedField === "bankName" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                    <span className="text-zinc-400">Account Number</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-base text-emerald-400">
                        {platformAccount.accountNumber}
                      </span>
                      <button
                        onClick={() =>
                          handleCopy(platformAccount.accountNumber, "accountNumber")
                        }
                        className="text-[10px] text-blue-400 hover:text-blue-300"
                      >
                        {copiedField === "accountNumber" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                    <span className="text-zinc-400">Account Name</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        {platformAccount.accountName}
                      </span>
                      <button
                        onClick={() => handleCopy(platformAccount.accountName, "accountName")}
                        className="text-[10px] text-blue-400 hover:text-blue-300"
                      >
                        {copiedField === "accountName" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-zinc-400 font-medium">Payment Remark / Ref</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded">
                        {buyReference}
                      </span>
                      <button
                        onClick={() => handleCopy(buyReference, "reference")}
                        className="text-[10px] text-blue-400 hover:text-blue-300"
                      >
                        {copiedField === "reference" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
                  <p className="font-semibold text-zinc-300">💡 Important Instructions:</p>
                  <p>1. Open your banking app and transfer exactly ₦{nairaEquivalent.toLocaleString()}.</p>
                  <p>2. Put <span className="font-mono text-yellow-400">{buyReference}</span> in the description/narration.</p>
                  <p>3. Tap the button below after completing the transfer.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBuyStep(1)}
                    className="py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    disabled={buying}
                    onClick={handleExecuteBuy}
                    className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950 transition-all disabled:opacity-50"
                  >
                    {buying ? "Verifying..." : "I Have Made Payment"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Buy Complete / Funded Screen */}
            {buyStep === 3 && buyResult && (
              <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 text-center space-y-4">
                {buyResult.success ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl mx-auto border border-emerald-500/30">
                      🎉
                    </div>
                    <h3 className="text-lg font-bold text-white">Payment Confirmed!</h3>
                    <p className="text-xs text-zinc-400">
                      Your wallet has been funded with{" "}
                      <span className="font-bold text-emerald-400">
                        {buyResult.cryptoAmount} {buyResult.token}
                      </span>
                      .
                    </p>

                    <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-400 text-left space-y-1">
                      <div className="flex justify-between">
                        <span>Reference</span>
                        <span className="text-zinc-200">{buyResult.reference}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Credited Amount</span>
                        <span className="text-emerald-400 font-semibold">
                          +{buyResult.cryptoAmount} {buyResult.token}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status</span>
                        <span className="text-emerald-400 font-semibold">Funded & Available</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={resetForm}
                        className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl transition-all"
                      >
                        Buy More
                      </button>
                      <button
                        onClick={() => router.push("/")}
                        className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all"
                      >
                        View in Home
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-3xl mx-auto border border-rose-500/30">
                      ✕
                    </div>
                    <h3 className="text-lg font-bold text-white">Payment Failed</h3>
                    <p className="text-xs text-rose-400">
                      {buyResult.error || "Unable to confirm payment."}
                    </p>
                    <button
                      onClick={() => setBuyStep(2)}
                      className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl transition-all"
                    >
                      Try Again
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
