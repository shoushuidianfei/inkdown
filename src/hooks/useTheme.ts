import { create } from "zustand";

export type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// 从本地存储加载主题
const loadTheme = (): Theme => {
  const saved = localStorage.getItem("inkdown_theme");
  if (saved === "light" || saved === "dark") {
    return saved;
  }
  // 默认暗色主题
  return "dark";
};

// 保存主题到本地存储
const saveTheme = (theme: Theme) => {
  localStorage.setItem("inkdown_theme", theme);
};

// 应用主题到 DOM
const applyTheme = (theme: Theme) => {
  document.documentElement.setAttribute("data-theme", theme);
};

export const useTheme = create<ThemeState>((set, get) => ({
  theme: loadTheme(),

  setTheme: (theme: Theme) => {
    saveTheme(theme);
    applyTheme(theme);
    set({ theme });
  },

  toggleTheme: () => {
    const current = get().theme;
    const next = current === "dark" ? "light" : "dark";
    get().setTheme(next);
  },
}));

// 初始化主题
applyTheme(loadTheme());
