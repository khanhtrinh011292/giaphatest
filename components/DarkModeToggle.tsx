"use client";

import { useTheme } from "@/components/ThemeProvider";
import { Moon, Sun } from "lucide-react";

export default function DarkModeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Chuyển sang sáng" : "Chuyển sang tối"}
      className="relative size-9 rounded-xl flex items-center justify-center transition-all
        bg-stone-100 hover:bg-stone-200 text-stone-600
        dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300"
    >
      <Sun
        className={`size-4 absolute transition-all duration-300 ${
          theme === "dark" ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-75"
        }`}
      />
      <Moon
        className={`size-4 absolute transition-all duration-300 ${
          theme === "light" ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-75"
        }`}
      />
    </button>
  );
}
