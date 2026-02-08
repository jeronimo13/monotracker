import React, { useState, useEffect, useRef, useCallback } from "react";
import { TrashIcon, BeakerIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type {
  AccountSource,
  AccountSourceMap,
  ClientInfo,
  MonobankAccount,
} from "../types";
import { fetchMonobankClientInfo } from "../services/monobankApi";
import {
  createDefaultSyncState,
  ONBOARDING_TOKEN_KEY,
  readStoredData,
  updateStoredData,
} from "../utils/storageData";
import type { TerminalStatusMessage } from "./TerminalStatusBar";

interface ApiConfigPanelProps {
  onTokenConnected: (payload: {
    token: string;
    clientInfo: ClientInfo;
    source: AccountSource;
  }) => void | Promise<void>;
  onUseSampleData: () => void;
  onClearData: () => void;
  hasTransactions: boolean;
  onStatusChange?: (status: Omit<TerminalStatusMessage, "timestamp">) => void;
}

const getCurrencyIsoCode = (currencyCode: number): string => {
  switch (currencyCode) {
    case 980:
      return "UAH";
    case 840:
      return "USD";
    case 978:
      return "EUR";
    case 985:
      return "PLN";
    default:
      return "UAH";
  }
};

const formatMoney = (amount: number | undefined, currencyCode: number): string => {
  const normalizedAmount = typeof amount === "number" ? amount : 0;
  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: getCurrencyIsoCode(currencyCode),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(normalizedAmount / 100);
};

const formatAccountType = (type: string): string => {
  switch (type) {
    case "black":
      return "Чорна картка";
    case "white":
      return "Біла картка";
    case "platinum":
      return "Platinum";
    case "fop":
      return "ФОП";
    case "yellow":
      return "Жовта картка";
    case "jar":
      return "Банка";
    default:
      return type;
  }
};

const formatAccountSource = (source: AccountSource | undefined): string => {
  if (source === "settings") {
    return "налаштування";
  }
  if (source === "onboarding") {
    return "онбординг";
  }
  return "невідомо";
};

const mergeAccountSourceMap = (
  currentMap: AccountSourceMap,
  accounts: MonobankAccount[],
  source: AccountSource
): AccountSourceMap => {
  const nextMap: AccountSourceMap = { ...currentMap };
  const now = Date.now();

  accounts.forEach((account) => {
    if (!nextMap[account.id]) {
      nextMap[account.id] = {
        source,
        addedAt: now,
      };
    }
  });

  return nextMap;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "Не вдалося перевірити токен";
};

export const ApiConfigPanel: React.FC<ApiConfigPanelProps> = ({
  onTokenConnected,
  onUseSampleData,
  onClearData,
  hasTransactions,
  onStatusChange,
}) => {
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [useRealData, setUseRealData] = useState<boolean>(false);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [accountSourceMap, setAccountSourceMap] = useState<AccountSourceMap>({});
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load token and client info from localStorage on mount
  useEffect(() => {
    try {
      const stored = readStoredData();
      if (stored) {
        setToken(stored.token || "");
        setUseRealData(stored.useRealData || false);
        setClientInfo(stored.clientInfo ?? null);
        setAccountSourceMap(stored.accountSourceMap ?? {});
        if (stored.token) {
          return;
        }
      }

      const onboardingToken = localStorage.getItem(ONBOARDING_TOKEN_KEY)?.trim();
      if (onboardingToken) {
        setToken(onboardingToken);
        updateStoredData((current) => ({
          ...current,
          token: onboardingToken,
          timestamp: Date.now(),
          sync: {
            ...(current.sync ?? createDefaultSyncState()),
            status: "idle",
            needsInitialSync: true,
            lastError: undefined,
          },
        }));
        localStorage.removeItem(ONBOARDING_TOKEN_KEY);
      }
    } catch (loadError) {
      console.error("Error loading token:", loadError);
    }
  }, []);

  const fetchClientInfo = useCallback(
    async (tokenValue: string) => {
      if (!tokenValue.trim()) {
        setClientInfo(null);
        setError("");
        setUseRealData(false);
        onStatusChange?.({
          level: "info",
          text: "Токен очищено. Використовуються локальні або демо-дані.",
        });
        return;
      }

      setIsVerifying(true);
      setError("");
      onStatusChange?.({
        level: "info",
        text: "Синхронізація з Monobank: перевіряю токен...",
      });

      let syncPayload: { token: string; clientInfo: ClientInfo; source: AccountSource } | null = null;
      try {
        const data = await fetchMonobankClientInfo(tokenValue);
        const nextSourceMap = mergeAccountSourceMap(accountSourceMap, data.accounts ?? [], "settings");

        setClientInfo(data);
        setAccountSourceMap(nextSourceMap);
        setUseRealData(true);

        updateStoredData((current) => ({
          ...current,
          token: tokenValue,
          useRealData: true,
          clientInfo: data,
          accountSourceMap: nextSourceMap,
          sync: {
            ...(current.sync ?? createDefaultSyncState()),
            status: "idle",
            needsInitialSync: true,
            lastError: undefined,
          },
          timestamp: Date.now(),
        }));

        onStatusChange?.({
          level: "success",
          text: `Monobank підключено: ${data.name}`,
        });
        syncPayload = {
          token: tokenValue,
          clientInfo: data,
          source: "settings",
        };
      } catch (fetchError) {
        setClientInfo(null);
        setUseRealData(false);
        const errorMessage = getErrorMessage(fetchError);
        setError(errorMessage);

        updateStoredData((current) => ({
          ...current,
          token: tokenValue,
          useRealData: false,
          clientInfo: null,
          sync: {
            ...(current.sync ?? createDefaultSyncState()),
            status: "error",
            needsInitialSync: false,
            lastError: errorMessage,
          },
          timestamp: Date.now(),
        }));

        onStatusChange?.({
          level: "error",
          text: `Помилка синхронізації: ${errorMessage}`,
        });
      } finally {
        setIsVerifying(false);
      }

      if (syncPayload) {
        void Promise.resolve(onTokenConnected(syncPayload)).catch((syncError) => {
          const errorMessage = getErrorMessage(syncError);
          setError(errorMessage);
          onStatusChange?.({
            level: "error",
            text: `Помилка синхронізації: ${errorMessage}`,
          });
        });
      }
    },
    [accountSourceMap, onStatusChange, onTokenConnected]
  );

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
      void fetchClientInfo(value);
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

    updateStoredData((current) => ({
      ...current,
      token: "",
      useRealData: false,
      clientInfo: null,
      dataOrigin: "demo",
      sync: {
        ...(current.sync ?? createDefaultSyncState()),
        status: "idle",
        needsInitialSync: false,
        lastError: undefined,
      },
      timestamp: Date.now(),
    }));

    onUseSampleData();
    onStatusChange?.({
      level: "info",
      text: "Увімкнено демо-режим (без синхронізації Monobank).",
    });
  };

  const clearStoredData = () => {
    if (!confirm("Стерти всі дані та почати наново? Це видалить транзакції, токен і налаштування.")) {
      return;
    }

    localStorage.removeItem("monobankData");
    localStorage.removeItem("hasSeenOnboarding");
    localStorage.removeItem(ONBOARDING_TOKEN_KEY);
    localStorage.removeItem("monobank-theme");
    localStorage.removeItem("monobank-transaction-grouping-mode");

    setToken("");
    setError("");
    setClientInfo(null);
    setUseRealData(false);
    setAccountSourceMap({});
    onClearData();
    onStatusChange?.({
      level: "info",
      text: "Дані скинуто. Перехід до онбордингу...",
    });
    window.location.assign(`${import.meta.env.BASE_URL}onboarding`);
  };

  const dataSourceLabel = useRealData && clientInfo ? clientInfo.name : useRealData ? "Monobank API" : "Демо-дані";

  return (
    <div className="space-y-6">
      {/* Current Data Source */}
      <div className="dashboard-panel p-6">
        <h2 className="text-sm font-medium text-gray-500 mb-3">Джерело даних</h2>
        <div className="flex items-center gap-3">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-full ${
              useRealData ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
            }`}
          >
            {useRealData ? <CheckCircleIcon className="h-5 w-5" /> : <BeakerIcon className="h-5 w-5" />}
          </span>
          <div>
            <p className="text-base font-semibold text-gray-900">{dataSourceLabel}</p>
            <p className="text-xs text-gray-500">
              {useRealData && clientInfo
                ? `${clientInfo.accounts?.length || 0} рахунків`
                : useRealData
                  ? "Підключено до API"
                  : "Згенеровані тестові транзакції"}
            </p>
          </div>
        </div>
      </div>

      {/* API Token Section */}
      <div className="dashboard-panel p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">API Monobank</h2>
          <p className="mt-1 text-sm text-gray-500">Вставте токен &mdash; підключення перевіриться автоматично.</p>
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
                <div className="mt-2 space-y-2 text-xs text-green-700">
                  {clientInfo.accounts.map((acc) => (
                    <div key={acc.id} className="rounded border border-green-200 bg-white p-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-green-900">
                          {formatAccountType(acc.type)}
                          {acc.maskedPan?.[0] && ` (${acc.maskedPan[0]})`}
                        </p>
                        <p className="font-semibold text-green-900">{formatMoney(acc.balance, acc.currencyCode)}</p>
                      </div>
                      <p className="mt-1 break-all text-[11px] text-green-700">{acc.iban}</p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-green-700">
                        {typeof acc.creditLimit === "number" && (
                          <span>Кредитний ліміт: {formatMoney(acc.creditLimit, acc.currencyCode)}</span>
                        )}
                        <span>Source: {formatAccountSource(accountSourceMap[acc.id]?.source)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!hasTransactions && (
            <button onClick={switchToSampleData} className="settings-btn-secondary">
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
          <p className="text-sm text-gray-600 mb-3">Скинути всі налаштування, видалити транзакції та почати наново.</p>
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
