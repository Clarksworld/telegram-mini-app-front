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
  wallets: WalletInfo[];
}

interface AppState {
  user: AppUser | null;
  initData: string | null;
  isAuthenticated: boolean;
  setUser: (user: AppUser) => void;
  setInitData: (data: string) => void;
  setAuth: (status: boolean) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  initData: null,
  isAuthenticated: false,
  setUser: (user) => set({ user }),
  setInitData: (data) => set({ initData: data }),
  setAuth: (status) => set({ isAuthenticated: status }),
  logout: () => set({ user: null, initData: null, isAuthenticated: false }),
}));
