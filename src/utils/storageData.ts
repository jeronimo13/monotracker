import type {
  AccountSourceMap,
  DataOrigin,
  StoredData,
  SyncState,
  SyncStatus,
  Transaction,
} from "../types";

export const MONOBANK_DATA_KEY = "monobankData";
export const ONBOARDING_TOKEN_KEY = "onboarding-token";
export const DEFAULT_SYNC_WINDOW_DAYS = 365;

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isDataOrigin = (value: unknown): value is DataOrigin => {
  return value === "demo" || value === "real" || value === "imported";
};

const isSyncStatus = (value: unknown): value is SyncStatus => {
  return value === "idle" || value === "syncing" || value === "cooldown" || value === "error";
};

const normalizeAccountSourceMap = (value: unknown): AccountSourceMap => {
  if (!isObjectRecord(value)) {
    return {};
  }

  const result: AccountSourceMap = {};

  Object.entries(value).forEach(([accountId, entry]) => {
    if (!isObjectRecord(entry)) {
      return;
    }

    const source = entry.source;
    const addedAt = entry.addedAt;

    if (
      (source === "onboarding" || source === "settings") &&
      typeof addedAt === "number" &&
      Number.isFinite(addedAt)
    ) {
      result[accountId] = { source, addedAt };
    }
  });

  return result;
};

const normalizeSyncState = (value: unknown): SyncState => {
  const raw = isObjectRecord(value) ? value : {};
  const status = isSyncStatus(raw.status) ? raw.status : "idle";
  const windowDays =
    typeof raw.windowDays === "number" && raw.windowDays >= DEFAULT_SYNC_WINDOW_DAYS
      ? Math.floor(raw.windowDays)
      : DEFAULT_SYNC_WINDOW_DAYS;

  const nextAllowedRequestAt =
    typeof raw.nextAllowedRequestAt === "number" && Number.isFinite(raw.nextAllowedRequestAt)
      ? raw.nextAllowedRequestAt
      : undefined;

  const normalized: SyncState = {
    status,
    windowDays,
    needsInitialSync: Boolean(raw.needsInitialSync),
  };

  if (typeof raw.lastSyncStartedAt === "number" && Number.isFinite(raw.lastSyncStartedAt)) {
    normalized.lastSyncStartedAt = raw.lastSyncStartedAt;
  }
  if (typeof raw.lastSyncFinishedAt === "number" && Number.isFinite(raw.lastSyncFinishedAt)) {
    normalized.lastSyncFinishedAt = raw.lastSyncFinishedAt;
  }
  if (typeof raw.lastSuccessfulSyncAt === "number" && Number.isFinite(raw.lastSuccessfulSyncAt)) {
    normalized.lastSuccessfulSyncAt = raw.lastSuccessfulSyncAt;
  }
  if (nextAllowedRequestAt !== undefined) {
    normalized.nextAllowedRequestAt = nextAllowedRequestAt;
  }
  if (typeof raw.lastError === "string" && raw.lastError.trim() !== "") {
    normalized.lastError = raw.lastError;
  }

  return normalized;
};

const normalizeTransactions = (value: unknown): Transaction[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => isObjectRecord(item))
    .map((item) => {
      const accountId =
        typeof item.accountId === "string" && item.accountId.trim() !== ""
          ? item.accountId
          : "legacy";

      return {
        id: String(item.id ?? ""),
        accountId,
        time: typeof item.time === "number" && Number.isFinite(item.time) ? item.time : 0,
        description: typeof item.description === "string" ? item.description : "",
        mcc: typeof item.mcc === "number" && Number.isFinite(item.mcc) ? item.mcc : 0,
        originalMcc:
          typeof item.originalMcc === "number" && Number.isFinite(item.originalMcc)
            ? item.originalMcc
            : typeof item.mcc === "number" && Number.isFinite(item.mcc)
              ? item.mcc
              : 0,
        hold: Boolean(item.hold),
        amount: typeof item.amount === "number" && Number.isFinite(item.amount) ? item.amount : 0,
        operationAmount:
          typeof item.operationAmount === "number" && Number.isFinite(item.operationAmount)
            ? item.operationAmount
            : typeof item.amount === "number" && Number.isFinite(item.amount)
              ? item.amount
              : 0,
        currencyCode:
          typeof item.currencyCode === "number" && Number.isFinite(item.currencyCode)
            ? item.currencyCode
            : 980,
        commissionRate:
          typeof item.commissionRate === "number" && Number.isFinite(item.commissionRate)
            ? item.commissionRate
            : 0,
        cashbackAmount:
          typeof item.cashbackAmount === "number" && Number.isFinite(item.cashbackAmount)
            ? item.cashbackAmount
            : 0,
        balance: typeof item.balance === "number" && Number.isFinite(item.balance) ? item.balance : 0,
        comment: typeof item.comment === "string" ? item.comment : "",
        receiptId: typeof item.receiptId === "string" ? item.receiptId : "",
        invoiceId: typeof item.invoiceId === "string" ? item.invoiceId : "",
        counterEdrpou: typeof item.counterEdrpou === "string" ? item.counterEdrpou : "",
        counterIban: typeof item.counterIban === "string" ? item.counterIban : "",
        category: typeof item.category === "string" ? item.category : undefined,
      };
    });
};

const normalizeCategories = (value: unknown): Record<string, string> => {
  if (!isObjectRecord(value)) {
    return {};
  }

  const result: Record<string, string> = {};
  Object.entries(value).forEach(([key, maybeValue]) => {
    if (typeof maybeValue === "string") {
      result[key] = maybeValue;
    }
  });
  return result;
};

export const createDefaultSyncState = (): SyncState => ({
  status: "idle",
  windowDays: DEFAULT_SYNC_WINDOW_DAYS,
  needsInitialSync: false,
});

export const inferDataOrigin = (value: unknown, useRealData: boolean): DataOrigin => {
  if (isDataOrigin(value)) {
    return value;
  }

  return useRealData ? "real" : "demo";
};

export const normalizeStoredData = (value: unknown): StoredData => {
  const raw = isObjectRecord(value) ? value : {};
  const token = typeof raw.token === "string" ? raw.token : "";
  const useRealData = Boolean(raw.useRealData);
  const transactions = normalizeTransactions(raw.transactions);
  const categories = normalizeCategories(raw.categories);
  const timestamp =
    typeof raw.timestamp === "number" && Number.isFinite(raw.timestamp) ? raw.timestamp : Date.now();
  const dataOrigin = inferDataOrigin(raw.dataOrigin, useRealData);
  const accountSourceMap = normalizeAccountSourceMap(raw.accountSourceMap);
  const sync = normalizeSyncState(raw.sync);

  const normalized: StoredData = {
    token,
    transactions,
    timestamp,
    useRealData,
    categories,
    dataOrigin,
    accountSourceMap,
    sync,
  };

  if (isObjectRecord(raw.clientInfo)) {
    normalized.clientInfo = raw.clientInfo as unknown as StoredData["clientInfo"];
  } else if (raw.clientInfo === null) {
    normalized.clientInfo = null;
  }

  return normalized;
};

export const createDemoStoredData = (transactions: Transaction[]): StoredData => {
  return {
    token: "",
    transactions,
    timestamp: Date.now(),
    useRealData: false,
    categories: {},
    clientInfo: null,
    dataOrigin: "demo",
    accountSourceMap: {},
    sync: createDefaultSyncState(),
  };
};

export const readStoredData = (): StoredData | null => {
  try {
    const raw = localStorage.getItem(MONOBANK_DATA_KEY);
    if (!raw) {
      return null;
    }
    return normalizeStoredData(JSON.parse(raw));
  } catch (error) {
    console.error("Error reading monobankData:", error);
    return null;
  }
};

export const writeStoredData = (data: StoredData): void => {
  localStorage.setItem(MONOBANK_DATA_KEY, JSON.stringify(normalizeStoredData(data)));
};

export const updateStoredData = (updater: (current: StoredData) => StoredData): StoredData => {
  const current = readStoredData() ?? normalizeStoredData({});
  const next = normalizeStoredData(updater(current));
  writeStoredData(next);
  return next;
};
