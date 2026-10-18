import { create } from 'zustand';

interface User {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface AppState {
  user: User | null;
  initData: string | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
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
