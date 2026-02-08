import React, { useState, useEffect, useRef, useCallback } from "react";
import { TrashIcon, BeakerIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface ClientInfo {
  clientId: string;
  name: string;
  accounts: {
    id: string;
    type: string;
    currencyCode: number;
    maskedPan?: string[];
    iban: string;
  }[];
}

interface ApiConfigPanelProps {
  onTokenUpdate: (newTransactions: any[]) => void;
  hasTransactions: boolean;
}

export const ApiConfigPanel: React.FC<ApiConfigPanelProps> = ({ onTokenUpdate, hasTransactions }) => {
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [useRealData, setUseRealData] = useState<boolean>(false);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load token and client info from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("monobankData");
      if (stored) {
        const data = JSON.parse(stored);
        setToken(data.token || "");
        setUseRealData(data.useRealData || false);
        if (data.clientInfo) {
          setClientInfo(data.clientInfo);
        }
        if (data.token) {
          return;
        }
      }

      const onboardingToken = localStorage.getItem("onboarding-token")?.trim();
      if (onboardingToken) {
        setToken(onboardingToken);

        const existingData = stored ? JSON.parse(stored) : {};
        localStorage.setItem("monobankData", JSON.stringify({
          token: onboardingToken,
          transactions: Array.isArray(existingData.transactions) ? existingData.transactions : [],
          timestamp: Date.now(),
          useRealData: Boolean(existingData.useRealData),
          categories: existingData.categories && typeof existingData.categories === "object" ? existingData.categories : {},
        }));
        localStorage.removeItem("onboarding-token");
      }
    } catch (error) {
      console.error("Error loading token:", error);
    }
  }, []);

  const updateStoredData = (updates: Record<string, unknown>) => {
    try {
      const stored = localStorage.getItem("monobankData");
      const data = stored ? JSON.parse(stored) : {
        token: "",
        transactions: [],
        timestamp: Date.now(),
        useRealData: false,
        categories: {},
      };
      Object.assign(data, updates, { timestamp: Date.now() });
      localStorage.setItem("monobankData", JSON.stringify(data));
    } catch (error) {
      console.error("Error updating stored data:", error);
    }
  };

  const fetchClientInfo = useCallback(async (tokenValue: string) => {
    if (!tokenValue.trim()) {
      setClientInfo(null);
      setError("");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const response = await fetch(
        "https://api.monobank.ua/personal/client-info",
        { headers: { "X-Token": tokenValue } }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Недійсний токен");
        } else if (response.status === 429) {
          throw new Error("Забагато запитів. Спробуйте за хвилину.");
        } else {
          throw new Error(`Помилка API: ${response.status}`);
        }
      }

      const data = await response.json();
      setClientInfo(data);
      updateStoredData({ token: tokenValue, useRealData: true, clientInfo: data });
      setUseRealData(true);
    } catch (err) {
      setClientInfo(null);
      setError(err instanceof Error ? err.message : "Не вдалося перевірити токен");
      updateStoredData({ token: tokenValue, useRealData: false, clientInfo: null });
      setUseRealData(false);
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const handleTokenChange = (value: string) => {
    setToken(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!value.trim()) {
      setClientInfo(null);
      setError("");
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchClientInfo(value);
    }, 800);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const switchToSampleData = () => {
    setUseRealData(false);
    setToken("");
    setError("");
    setClientInfo(null);
    updateStoredData({ token: "", useRealData: false, clientInfo: null });
    onTokenUpdate([-1] as any); // Special signal to load sample data
  };

  const clearStoredData = () => {
    if (!confirm("Стерти всі дані та почати наново? Це видалить транзакції, токен і налаштування.")) {
      return;
    }

    localStorage.removeItem("monobankData");
    localStorage.removeItem("hasSeenOnboarding");
    localStorage.removeItem("onboarding-token");
    localStorage.removeItem("monobank-theme");
    setToken("");
    setError("");
    setClientInfo(null);
    setUseRealData(false);
    onTokenUpdate([]); // Signal to clear all data
    window.location.assign(`${import.meta.env.BASE_URL}onboarding`);
  };

  const dataSourceLabel = useRealData && clientInfo
    ? clientInfo.name
    : useRealData
      ? "Monobank API"
      : "Демо-дані";

  return (
    <div className="space-y-6">
      {/* Current Data Source */}
      <div className="dashboard-panel p-6">
        <h2 className="text-sm font-medium text-gray-500 mb-3">Джерело даних</h2>
        <div className="flex items-center gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded-full ${
            useRealData
              ? "bg-green-100 text-green-600"
              : "bg-amber-100 text-amber-600"
          }`}>
            {useRealData ? (
              <CheckCircleIcon className="h-5 w-5" />
            ) : (
              <BeakerIcon className="h-5 w-5" />
            )}
          </span>
          <div>
            <p className="text-base font-semibold text-gray-900">{dataSourceLabel}</p>
            <p className="text-xs text-gray-500">
              {useRealData && clientInfo
                ? `${clientInfo.accounts?.length || 0} рахунків`
                : useRealData
                  ? "Підключено до API"
                  : "Згенеровані тестові транзакції"
              }
            </p>
          </div>
        </div>
      </div>

      {/* API Token Section */}
      <div className="dashboard-panel p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            API Monobank
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Вставте токен &mdash; підключення перевіриться автоматично.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="monobank-token" className="block text-sm font-medium text-gray-700 mb-1.5">
              Токен доступу
            </label>
            <div className="relative">
              <input
                id="monobank-token"
                type="password"
                value={token}
                onChange={(e) => handleTokenChange(e.target.value)}
                placeholder="Вставте токен з api.monobank.ua"
                className="settings-input pr-10"
              />
              {isVerifying && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="h-4 w-4 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
              {!isVerifying && clientInfo && token && (
                <CheckCircleIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
              {!isVerifying && error && token && (
                <ExclamationTriangleIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
              )}
            </div>
          </div>

          {/* Client info card */}
          {clientInfo && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              <p className="font-medium">{clientInfo.name}</p>
              {clientInfo.accounts?.length > 0 && (
                <div className="mt-1.5 space-y-0.5 text-xs text-green-700">
                  {clientInfo.accounts.map((acc) => (
                    <p key={acc.id}>
                      {acc.type === "black" ? "Чорна картка" :
                       acc.type === "white" ? "Біла картка" :
                       acc.type === "platinum" ? "Platinum" :
                       acc.type === "fop" ? "ФОП" :
                       acc.type === "yellow" ? "Жовта картка" :
                       acc.type}
                      {acc.maskedPan?.[0] && ` (${acc.maskedPan[0]})`}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {!hasTransactions && (
            <button
              onClick={switchToSampleData}
              className="settings-btn-secondary"
            >
              <BeakerIcon className="h-4 w-4" aria-hidden="true" />
              Використати демо-дані
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="dashboard-panel overflow-hidden">
        <div className="border-b border-red-200 bg-red-50 px-6 py-3">
          <h3 className="text-sm font-semibold text-red-800">Небезпечна зона</h3>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 mb-3">
            Скинути всі налаштування, видалити транзакції та почати наново.
          </p>
          <button
            onClick={clearStoredData}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
            title="Стерти всі дані і почати наново"
          >
            <TrashIcon className="h-4 w-4" aria-hidden="true" />
            Стерти всі дані
          </button>
        </div>
      </div>
    </div>
  );
};
