"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type ThemeName = "default" | "dashboard" | "staff" | "products" | "inventory" | "reports" | "users";

type Theme = Record<string, string>;

const themes: Record<ThemeName, Theme> = {
  default: {
    "--bg": "#050b26",
    "--card-bg": "#0f1735",
    "--accent": "#7c5cff",
    "--accent-2": "#06b6d4",
    "--text": "#e6eef8",
  },
  dashboard: {
    "--bg": "#050b26",
    "--card-bg": "#0f1735",
    "--accent": "#7c5cff",
    "--accent-2": "#06b6d4",
    "--text": "#e6eef8",
  },
  staff: {
    "--bg": "#f6fbf6",
    "--card-bg": "#ffffff",
    "--accent": "#16a34a",
    "--accent-2": "#22c55e",
    "--text": "#12301f",
  },
  products: {
    "--bg": "#081022",
    "--card-bg": "#0b1730",
    "--accent": "#10b981",
    "--accent-2": "#06b6d4",
    "--text": "#e6eef8",
  },
  inventory: {
    "--bg": "#031022",
    "--card-bg": "#0f1735",
    "--accent": "#8b5cf6",
    "--accent-2": "#06b6d4",
    "--text": "#e6eef8",
  },
  reports: {
    "--bg": "#0b0812",
    "--card-bg": "#121226",
    "--accent": "#ef4444",
    "--accent-2": "#f59e0b",
    "--text": "#e6eef8",
  },
  users: {
    "--bg": "#071022",
    "--card-bg": "#0f1530",
    "--accent": "#06b6d4",
    "--accent-2": "#7c5cff",
    "--text": "#e6eef8",
  },
};

type ThemeContextValue = {
  themeName: ThemeName;
  setThemeName: (t: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeProvider({ children, initial = "default" as ThemeName }: { children: React.ReactNode; initial?: ThemeName }) {
  const [themeName, setThemeName] = useState<ThemeName>(initial);

  const vars = useMemo(() => themes[themeName] ?? themes.default, [themeName]);
  const style = vars as React.CSSProperties;

  return (
    <ThemeContext.Provider value={{ themeName, setThemeName }}>
      <div style={style} data-theme={themeName}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export type { ThemeName };