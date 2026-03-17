"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-300 group
        text-slate-600 hover:bg-slate-100 hover:text-slate-900 
        dark:text-slate-400 dark:hover:bg-[#12142a]/80 dark:hover:text-white"
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        <Sun
          className={`absolute w-5 h-5 transition-all duration-300 ${
            theme === "dark"
              ? "opacity-0 scale-50 rotate-90"
              : "opacity-100 scale-100 rotate-0"
          }`}
        />
        <Moon
          className={`absolute w-5 h-5 transition-all duration-300 ${
            theme === "light"
              ? "opacity-0 scale-50 -rotate-90"
              : "opacity-100 scale-100 rotate-0"
          }`}
        />
      </div>
      <span className="font-medium text-sm">
        {theme === "light" ? "Dark Mode" : "Light Mode"}
      </span>
    </button>
  );
}
