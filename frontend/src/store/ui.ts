import { create } from "zustand";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;  // ms; default 4000
}

interface UIState {
  // Global Trade Sheet (opened by Trade tab)
  isTradeSheetOpen: boolean;
  openTradeSheet: () => void;
  closeTradeSheet: () => void;

  // Toast queue
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;

  // Mobile bottom nav active tab
  activeTab: "home" | "markets" | "trade" | "watchlist" | "portfolio";
  setActiveTab: (tab: UIState["activeTab"]) => void;
}

let toastCounter = 0;

export const useUIStore = create<UIState>((set) => ({
  isTradeSheetOpen: false,
  openTradeSheet: () => set({ isTradeSheetOpen: true }),
  closeTradeSheet: () => set({ isTradeSheetOpen: false }),

  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { ...toast, id: `toast-${++toastCounter}` },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  activeTab: "home",
  setActiveTab: (activeTab) => set({ activeTab }),
}));
