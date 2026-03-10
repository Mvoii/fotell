import { create } from "zustand";
import { User } from "@/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;

  // Getters
  getAccessToken: () => string | null;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;

  // Setters
  setUser: (user: User) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,

  getAccessToken: () => get().accessToken,
  isAuthenticated: () => get().accessToken !== null && get().user !== null,
  isAdmin: () => get().user?.role === "ADMIN",

  setUser: (user) => set({ user }),
  setAccessToken: (accessToken) => set({ accessToken }),

  clearAuth: () => set({ user: null, accessToken: null }),
}));
