import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

const THEME_KEY = 'theme';

/** Resolve the initial theme: stored preference → OS preference → light. */
const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/** Apply the theme by toggling the `dark` class on <html>. */
const applyTheme = (theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
};

export const useUIStore = create(
  subscribeWithSelector((set, get) => ({
    sidebarOpen: false,
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    theme: getInitialTheme(),
    setTheme: (theme) => {
      applyTheme(theme);
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch {
        /* ignore storage errors (private mode, etc.) */
      }
      set({ theme });
    },
    toggleTheme: () => {
      const next = get().theme === 'dark' ? 'light' : 'dark';
      get().setTheme(next);
    },
  }))
);

// Ensure the DOM matches the store on load (in case the inline boot script is absent).
if (typeof window !== 'undefined') {
  applyTheme(useUIStore.getState().theme);
}
