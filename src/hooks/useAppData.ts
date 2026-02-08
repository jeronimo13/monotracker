import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AccountSource,
  AccountSourceMap,
  ClientInfo,
  DataOrigin,
  StatusUpdate,
  StoredData,
  Transaction,
} from "../types";
import { generateDemoTransactions } from "../data/generateDemoTransactions";
import { fetchMonobankClientInfo, MonobankApiError } from "../services/monobankApi";
import {
  MONOBANK_MIN_REQUEST_INTERVAL_MS,
  mergeTransactionsByOrigin,
  syncMonobankTransactions,
  type SyncProgress,
} from "../services/monobankSync";
import {
  createDefaultSyncState,
  createDemoStoredData,
  DEFAULT_SYNC_WINDOW_DAYS,
  MONOBANK_DATA_KEY,
  ONBOARDING_TOKEN_KEY,
  readStoredData,
  updateStoredData,
  writeStoredData,
} from "../utils/storageData";

interface AppData {
  transactions: Transaction[];
  categories: { [key: string]: string };
}

interface SyncOptions {
  source: AccountSource;
  force?: boolean;
  onStatusChange?: (status: StatusUpdate) => void;
}

interface ConnectTokenOptions extends SyncOptions {
  token: string;
  clientInfo?: ClientInfo | null;
}

interface UseAppDataReturn extends AppData {
  setTransactions: (transactions: Transaction[]) => void;
  setCategories: (categories: { [key: string]: string }) => void;
  saveData: () => void;
  clearData: () => void;
  loadSampleData: () => void;
  importData: (data: AppData) => void;
  exportData: () => AppData;
  connectToken: (options: ConnectTokenOptions) => Promise<void>;
  syncTransactions: (options: SyncOptions) => Promise<void>;
  isSyncing: boolean;
}

const mergeAccountSourceMap = (
  currentMap: AccountSourceMap | undefined,
  accounts: ClientInfo["accounts"],
  source: AccountSource
): AccountSourceMap => {
  const nextMap: AccountSourceMap = { ...(currentMap ?? {}) };
  const addedAt = Date.now();

  accounts.forEach((account) => {
    if (!nextMap[account.id]) {
      nextMap[account.id] = {
        source,
        addedAt,
      };
    }
  });

  return nextMap;
};

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof MonobankApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Невідома помилка синхронізації";
};

const formatCompactDayMonth = (unixSeconds: number): string => {
  const date = new Date(unixSeconds * 1000);
  const day = date.toLocaleDateString("uk-UA", { day: "2-digit" });
  const month = date.toLocaleDateString("uk-UA", { month: "short" }).replace(".", "");
  return `${day}/${month}`;
};

const resolveSyncOrigin = (stored: StoredData): DataOrigin => {
  if (stored.dataOrigin === "imported") {
    return "imported";
  }

  const hasToken = typeof stored.token === "string" && stored.token.trim() !== "";
  if (hasToken) {
    return "real";
  }

  return stored.dataOrigin ?? (stored.useRealData ? "real" : "demo");
};

export const useAppData = (): UseAppDataReturn => {
  const [transactions, setTransactionsState] = useState<Transaction[]>([]);
  const [categories, setCategoriesState] = useState<{ [key: string]: string }>({});
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const syncPromiseRef = useRef<Promise<void> | null>(null);
  const transactionsRef = useRef<Transaction[]>([]);

  const setTransactionsWithRef = useCallback((nextTransactions: Transaction[]) => {
    transactionsRef.current = nextTransactions;
    setTransactionsState(nextTransactions);
  }, []);

  const loadStoredData = useCallback(() => {
    // Backward compatibility: migrate onboarding token into primary storage.
    try {
      const onboardingToken = localStorage.getItem(ONBOARDING_TOKEN_KEY)?.trim();
      if (onboardingToken) {
        updateStoredData((current) => ({
          ...current,
          dataOrigin: current.dataOrigin === "imported" ? "imported" : "real",
          token: current.token || onboardingToken,
          useRealData: true,
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
    } catch (error) {
      console.error("Error migrating onboarding token:", error);
    }

    try {
      const stored = readStoredData();
      if (stored) {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        // Check if stored data is less than 24 hours old
        if (now - stored.timestamp < oneDay) {
          setTransactionsWithRef(stored.transactions);
          setCategoriesState(stored.categories || {});
          return;
        }

        // Data is old, remove it
        localStorage.removeItem(MONOBANK_DATA_KEY);
      }
    } catch (error) {
      console.error("Error loading stored data:", error);
      localStorage.removeItem(MONOBANK_DATA_KEY);
    }

    const demoTransactions = generateDemoTransactions();
    const demoStorage = createDemoStoredData(demoTransactions);
    writeStoredData(demoStorage);
    setTransactionsWithRef(demoTransactions);
    setCategoriesState({});
  }, [setTransactionsWithRef]);

  // Load data from localStorage on mount
  useEffect(() => {
    loadStoredData();
  }, [loadStoredData]);

  // Clean up unused categories
  const cleanupUnusedCategories = (
    transactionsToCheck: Transaction[],
    currentCategories: { [key: string]: string }
  ): { [key: string]: string } => {
    const usedCategories = new Set(
      transactionsToCheck
        .map((tx) => tx.category)
        .filter((cat) => cat !== undefined && cat !== null && cat.trim() !== "")
    );

    const cleanedCategories: { [key: string]: string } = {};
    Object.entries(currentCategories).forEach(([key, value]) => {
      if (usedCategories.has(key)) {
        cleanedCategories[key] = value;
      }
    });

    return cleanedCategories;
  };

  const saveData = useCallback(() => {
    try {
      const cleanedCategories = cleanupUnusedCategories(transactions, categories);

      updateStoredData((current) => ({
        ...current,
        transactions,
        categories: cleanedCategories,
        timestamp: Date.now(),
      }));

      // Update categories state if cleanup removed any
      if (Object.keys(cleanedCategories).length !== Object.keys(categories).length) {
        setCategoriesState(cleanedCategories);
      }
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }, [transactions, categories]);

  const clearData = () => {
    localStorage.removeItem(MONOBANK_DATA_KEY);
    localStorage.removeItem("hasSeenOnboarding");
    localStorage.removeItem(ONBOARDING_TOKEN_KEY);
    setTransactionsWithRef([]);
    setCategoriesState({});
  };

  const loadSampleData = () => {
    const demoTransactions = generateDemoTransactions();
    writeStoredData(createDemoStoredData(demoTransactions));
    setTransactionsWithRef(demoTransactions);
    setCategoriesState({});
  };

  const importData = (data: AppData) => {
    setTransactionsWithRef(data.transactions);
    setCategoriesState(data.categories);

    const existing = readStoredData();
    const existingSync = existing?.sync ?? createDefaultSyncState();

    const importedStorage: StoredData = {
      token: existing?.token ?? "",
      transactions: data.transactions,
      timestamp: Date.now(),
      useRealData: Boolean(existing?.token),
      categories: data.categories,
      clientInfo: existing?.clientInfo ?? null,
      dataOrigin: "imported",
      accountSourceMap: existing?.accountSourceMap ?? {},
      sync: {
        ...existingSync,
        status: "idle",
        needsInitialSync: Boolean(existing?.token),
        lastError: undefined,
      },
    };

    writeStoredData(importedStorage);
  };

  const exportData = (): AppData => {
    return {
      transactions,
      categories,
    };
  };

  const setTransactions = (newTransactions: Transaction[]) => {
    setTransactionsWithRef(newTransactions);
  };

  const setCategories = (newCategories: { [key: string]: string }) => {
    setCategoriesState(newCategories);
  };

  const syncTransactions = useCallback(
    async ({ source, force = false, onStatusChange }: SyncOptions): Promise<void> => {
      if (syncPromiseRef.current) {
        return syncPromiseRef.current;
      }

      const run = async () => {
        const stored = readStoredData();
        if (!stored) {
          return;
        }

        const token = stored.token?.trim();
        if (!token) {
          return;
        }

        const shouldSync = force || Boolean(stored.sync?.needsInitialSync) || !stored.sync?.lastSuccessfulSyncAt;
        if (!shouldSync) {
          return;
        }

        const baseTransactions =
          transactionsRef.current.length > 0 ? transactionsRef.current : stored.transactions;
        const baseOrigin: DataOrigin = resolveSyncOrigin(stored);
        const syncStartedAt = Date.now();
        setIsSyncing(true);

        updateStoredData((current) => ({
          ...current,
          dataOrigin: baseOrigin === "imported" ? "imported" : "real",
          sync: {
            ...(current.sync ?? createDefaultSyncState()),
            status: "syncing",
            needsInitialSync: false,
            lastSyncStartedAt: syncStartedAt,
            lastError: undefined,
          },
          timestamp: Date.now(),
        }));

        try {
          let clientInfo = stored.clientInfo ?? null;
          let nextAllowedRequestAt = stored.sync?.nextAllowedRequestAt ?? 0;
          if (!clientInfo || !Array.isArray(clientInfo.accounts)) {
            onStatusChange?.({
              level: "info",
              text: "Синхронізація з Monobank: перевіряю токен...",
            });
            clientInfo = await fetchMonobankClientInfo(token);
            nextAllowedRequestAt = Math.max(
              nextAllowedRequestAt,
              Date.now() + MONOBANK_MIN_REQUEST_INTERVAL_MS
            );
          }

          const syncResult = await syncMonobankTransactions({
            token,
            clientInfo,
            existingTransactions: baseTransactions,
            dataOrigin: baseOrigin,
            onStatus: onStatusChange,
            onProgress: (progress: SyncProgress) => {
              const partialMerged = mergeTransactionsByOrigin(
                transactionsRef.current,
                progress.transactionsSnapshot,
                baseOrigin
              );
              setTransactionsWithRef(partialMerged.transactions);

              onStatusChange?.({
                level: "info",
                text: `Отримано ${progress.fetchedCount} транзакцій за період ${formatCompactDayMonth(progress.periodFrom)}-${formatCompactDayMonth(progress.periodTo)} (рахунок ${progress.accountIndex + 1}/${progress.accountsTotal})`,
              });
            },
            windowDays: stored.sync?.windowDays ?? DEFAULT_SYNC_WINDOW_DAYS,
            nextAllowedRequestAt,
          });

          const finalMerged = mergeTransactionsByOrigin(
            transactionsRef.current,
            syncResult.transactions,
            baseOrigin
          );
          setTransactionsWithRef(finalMerged.transactions);
          const syncFinishedAt = Date.now();

          updateStoredData((current) => {
            return {
              ...current,
              token,
              useRealData: true,
              clientInfo,
              transactions: finalMerged.transactions,
              dataOrigin: baseOrigin === "imported" ? "imported" : "real",
              accountSourceMap: mergeAccountSourceMap(current.accountSourceMap, clientInfo.accounts, source),
              sync: {
                ...(current.sync ?? createDefaultSyncState()),
                status: "idle",
                needsInitialSync: false,
                lastSyncStartedAt: syncStartedAt,
                lastSyncFinishedAt: syncFinishedAt,
                lastSuccessfulSyncAt: syncFinishedAt,
                nextAllowedRequestAt: syncResult.nextAllowedRequestAt,
                lastError: undefined,
              },
              timestamp: syncFinishedAt,
            };
          });
        } catch (error) {
          const errorMessage = extractErrorMessage(error);
          const syncFinishedAt = Date.now();

          updateStoredData((current) => ({
            ...current,
            sync: {
              ...(current.sync ?? createDefaultSyncState()),
              status: "error",
              needsInitialSync: true,
              lastSyncStartedAt: current.sync?.lastSyncStartedAt ?? syncStartedAt,
              lastSyncFinishedAt: syncFinishedAt,
              lastError: errorMessage,
            },
            timestamp: syncFinishedAt,
          }));

          onStatusChange?.({
            level: "error",
            text: `Помилка синхронізації: ${errorMessage}`,
          });
          throw error;
        } finally {
          setIsSyncing(false);
        }
      };

      const promise = run().finally(() => {
        syncPromiseRef.current = null;
      });
      syncPromiseRef.current = promise;
      return promise;
    },
    [setTransactionsWithRef]
  );

  const connectToken = useCallback(
    async ({ token, clientInfo, source, onStatusChange }: ConnectTokenOptions): Promise<void> => {
      const normalizedToken = token.trim();
      if (!normalizedToken) {
        updateStoredData((current) => ({
          ...current,
          token: "",
          useRealData: false,
          clientInfo: null,
          sync: {
            ...(current.sync ?? createDefaultSyncState()),
            status: "idle",
            needsInitialSync: false,
            lastError: undefined,
          },
          timestamp: Date.now(),
        }));
        return;
      }

      let resolvedClientInfo = clientInfo ?? null;
      if (!resolvedClientInfo) {
        onStatusChange?.({
          level: "info",
          text: "Синхронізація з Monobank: перевіряю токен...",
        });
        resolvedClientInfo = await fetchMonobankClientInfo(normalizedToken);
      }

      updateStoredData((current) => ({
        ...current,
        token: normalizedToken,
        useRealData: true,
        clientInfo: resolvedClientInfo,
        dataOrigin: current.dataOrigin === "imported" ? "imported" : "real",
        accountSourceMap: mergeAccountSourceMap(current.accountSourceMap, resolvedClientInfo.accounts, source),
        sync: {
          ...(current.sync ?? createDefaultSyncState()),
          status: "idle",
          needsInitialSync: true,
          lastError: undefined,
        },
        timestamp: Date.now(),
      }));

      await syncTransactions({
        source,
        force: true,
        onStatusChange,
      });
    },
    [syncTransactions]
  );

  // Auto-save when data changes (but not when data is cleared)
  useEffect(() => {
    if (transactions.length > 0) {
      saveData();
    }
  }, [transactions, categories, saveData]);

  return {
    transactions,
    categories,
    setTransactions,
    setCategories,
    saveData,
    clearData,
    loadSampleData,
    importData,
    exportData,
    connectToken,
    syncTransactions,
    isSyncing,
  };
};
