import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export const useUIStore = create(subscribeWithSelector((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
})));

