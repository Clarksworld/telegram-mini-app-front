import { create } from 'zustand';

export interface WalletInfo {
  id: string;
  currency: string;
  address: string | null;
  balance: string;
  lockedBalance: string;
}

export interface AppUser {
  id: string;
  telegramId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  languageCode?: string | null;
  walletIndex: number;
  tonDepositAddress?: string | null;
  bep20DepositAddress?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  wallets: WalletInfo[];
}

interface AppState {
  user: AppUser | null;
  initData: string | null;
  isAuthenticated: boolean;
  setUser: (user: AppUser) => void;
  setInitData: (data: string) => void;
  setAuth: (status: boolean) => void;
  updateBankDetails: (details: { bankName: string; accountNumber: string; accountName: string }) => void;
  updateWalletBalance: (currency: string, newBalance: number | string) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  initData: null,
  isAuthenticated: false,
  setUser: (user) => set({ user }),
  setInitData: (data) => set({ initData: data }),
  setAuth: (status) => set({ isAuthenticated: status }),
  updateBankDetails: (details) =>
    set((state) => ({
      user: state.user
        ? {
            ...state.user,
            bankName: details.bankName,
            accountNumber: details.accountNumber,
            accountName: details.accountName,
          }
        : null,
    })),
  updateWalletBalance: (currency, newBalance) =>
    set((state) => {
      if (!state.user) return {};
      const balanceStr = typeof newBalance === 'number' ? newBalance.toString() : newBalance;
      const existing = state.user.wallets.find((w) => w.currency === currency);
      let updatedWallets: WalletInfo[];
      if (existing) {
        updatedWallets = state.user.wallets.map((w) =>
          w.currency === currency ? { ...w, balance: balanceStr } : w
        );
      } else {
        updatedWallets = [
          ...state.user.wallets,
          {
            id: `wallet-${Date.now()}`,
            currency,
            address: null,
            balance: balanceStr,
            lockedBalance: '0',
          },
        ];
      }
      return {
        user: {
          ...state.user,
          wallets: updatedWallets,
        },
      };
    }),
  logout: () => set({ user: null, initData: null, isAuthenticated: false }),
}));
