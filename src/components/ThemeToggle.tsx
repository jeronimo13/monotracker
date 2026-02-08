import React from "react";
import { useTheme } from "../hooks/useTheme";

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDarkTheme = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDarkTheme ? "Увімкнути світлу тему" : "Увімкнути темну тему"}
      title={isDarkTheme ? "Світла тема" : "Темна тема"}
      className={`fixed right-4 top-4 z-50 inline-flex h-10 w-20 items-center rounded-full border-2 px-2.5 shadow-lg transition-all hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        isDarkTheme
          ? "border-slate-500 bg-slate-900 shadow-slate-900/35"
          : "border-amber-300 bg-amber-50 shadow-amber-900/20"
      }`}
    >
      <span className="z-20 flex h-5 w-5 items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          className={`h-5.5 w-5.5 drop-shadow-sm ${
            isDarkTheme ? "text-sky-100" : "text-slate-700"
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
        </svg>
      </span>
      <span className="z-20 ml-auto flex h-5 w-5 items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          className={`h-5.5 w-5.5 drop-shadow-sm ${
            isDarkTheme ? "text-amber-300" : "text-amber-600"
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      </span>
      <span
        aria-hidden="true"
        className={`absolute left-1 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full ring-1 transition-transform duration-200 ease-out ${
          isDarkTheme
            ? "translate-x-0 bg-slate-700 ring-white/15"
            : "translate-x-9 bg-white ring-amber-300/70"
        }`}
      />
    </button>
  );
};

export default ThemeToggle;
