import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";

const SettingsButton: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isDashboard = location.pathname === "/dashboard";
  const isSettingsView = isDashboard && searchParams.get("view") === "settings";

  return (
    <Link
      to={isSettingsView ? "/dashboard" : "/dashboard?view=settings"}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border shadow-lg transition-all hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 ${
        isSettingsView
          ? "border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950 dark:text-indigo-300"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
      aria-label={isSettingsView ? "Перейти до дашборду" : "Відкрити налаштування"}
      title={isSettingsView ? "Дашборд" : "Налаштування"}
    >
      <Cog6ToothIcon
        className={`h-6 w-6 transition-transform duration-300 ${isSettingsView ? "rotate-90" : ""}`}
        aria-hidden="true"
      />
    </Link>
  );
};

export default SettingsButton;
