import type { ClientInfo, DataOrigin, MonobankAccount, StatusUpdate, Transaction } from "../types";
import { fetchMonobankStatement, MonobankApiError, type MonobankStatementTransaction } from "./monobankApi";

export const MONOBANK_STATEMENT_LIMIT = 500;
export const MONOBANK_MIN_REQUEST_INTERVAL_MS = 60_000;
export const MONOBANK_STATEMENT_MAX_PERIOD_DAYS = 31;
const DAY_SECONDS = 24 * 60 * 60;
const MAX_STATEMENT_PERIOD_SECONDS = MONOBANK_STATEMENT_MAX_PERIOD_DAYS * DAY_SECONDS;
const DEFAULT_WINDOW_DAYS = 365;

interface SyncWindow {
  from: number;
  to: number;
}

interface StatementFetchContext {
  token: string;
  onStatus?: (status: StatusUpdate) => void;
  nextAllowedRequestAt: number;
  requestIntervalMs: number;
  fetchStatement: typeof fetchMonobankStatement;
  onProgress?: (progress: SyncProgress) => void;
  progressById: Map<string, Transaction>;
  lastCompletedRange?: {
    account: string;
    from: number;
    to: number;
    fetchedCount: number;
  };
}

export interface TransactionMergeStats {
  added: number;
  updated: number;
}

export interface SyncMonobankTransactionsParams {
  token: string;
  clientInfo: ClientInfo;
  existingTransactions: Transaction[];
  dataOrigin: DataOrigin;
  onStatus?: (status: StatusUpdate) => void;
  onProgress?: (progress: SyncProgress) => void;
  windowDays?: number;
  nextAllowedRequestAt?: number;
  requestIntervalMs?: number;
  fetchStatement?: typeof fetchMonobankStatement;
}

export interface SyncMonobankTransactionsResult {
  transactions: Transaction[];
  fetchedTransactions: number;
  mergeStats: TransactionMergeStats;
  syncWindow: SyncWindow;
  nextAllowedRequestAt: number;
}

export interface SyncProgress {
  fetchedCount: number;
  periodFrom: number;
  periodTo: number;
  accountId: string;
  accountIndex: number;
  accountsTotal: number;
  transactionsSnapshot: Transaction[];
}

const sleep = (ms: number): Promise<void> => {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
};

const dedupeTransactionsById = (transactions: Transaction[]): Transaction[] => {
  const byId = new Map<string, Transaction>();

  transactions.forEach((tx) => {
    const existing = byId.get(tx.id);
    if (!existing || tx.time >= existing.time) {
      byId.set(tx.id, tx);
    }
  });

  return Array.from(byId.values());
};

const sortTransactionsDesc = (transactions: Transaction[]): Transaction[] => {
  return [...transactions].sort((a, b) => b.time - a.time);
};

const formatCompactDayMonth = (unixSeconds: number): string => {
  const date = new Date(unixSeconds * 1000);
  const day = date.toLocaleDateString("uk-UA", { day: "2-digit" });
  const month = date.toLocaleDateString("uk-UA", { month: "short" }).replace(".", "");
  return `${day}/${month}`;
};

const formatIsoDate = (unixSeconds: number): string => {
  const date = new Date(unixSeconds * 1000);
  return date.toISOString().slice(0, 10);
};

const formatSyncRange = (from: number, to: number): string => {
  return `[${formatIsoDate(from)}; ${formatIsoDate(to)}]`;
};

const formatTransactionCount = (count: number): string => {
  const abs = Math.abs(count);
  const lastTwo = abs % 100;
  const lastDigit = abs % 10;

  if (lastTwo >= 11 && lastTwo <= 14) {
    return `${count} транзакцій`;
  }
  if (lastDigit === 1) {
    return `${count} транзакція`;
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${count} транзакції`;
  }
  return `${count} транзакцій`;
};

const normalizeTransaction = (raw: MonobankStatementTransaction, accountId: string): Transaction => {
  const generatedId =
    raw.id ||
    `${accountId}-${raw.time ?? 0}-${raw.mcc ?? 0}-${raw.amount ?? 0}-${raw.operationAmount ?? 0}`;

  return {
    id: String(generatedId),
    accountId,
    time: typeof raw.time === "number" && Number.isFinite(raw.time) ? raw.time : 0,
    description: raw.description ?? "",
    mcc: typeof raw.mcc === "number" && Number.isFinite(raw.mcc) ? raw.mcc : 0,
    originalMcc:
      typeof raw.originalMcc === "number" && Number.isFinite(raw.originalMcc)
        ? raw.originalMcc
        : typeof raw.mcc === "number" && Number.isFinite(raw.mcc)
          ? raw.mcc
          : 0,
    hold: Boolean(raw.hold),
    amount: typeof raw.amount === "number" && Number.isFinite(raw.amount) ? raw.amount : 0,
    operationAmount:
      typeof raw.operationAmount === "number" && Number.isFinite(raw.operationAmount)
        ? raw.operationAmount
        : typeof raw.amount === "number" && Number.isFinite(raw.amount)
          ? raw.amount
          : 0,
    currencyCode:
      typeof raw.currencyCode === "number" && Number.isFinite(raw.currencyCode)
        ? raw.currencyCode
        : 980,
    commissionRate:
      typeof raw.commissionRate === "number" && Number.isFinite(raw.commissionRate)
        ? raw.commissionRate
        : 0,
    cashbackAmount:
      typeof raw.cashbackAmount === "number" && Number.isFinite(raw.cashbackAmount)
        ? raw.cashbackAmount
        : 0,
    balance: typeof raw.balance === "number" && Number.isFinite(raw.balance) ? raw.balance : 0,
    comment: raw.comment ?? "",
    receiptId: raw.receiptId ?? "",
    invoiceId: raw.invoiceId ?? "",
    counterEdrpou: raw.counterEdrpou ?? "",
    counterIban: raw.counterIban ?? "",
    category: raw.category,
  };
};

const resolveAccountLabel = (accountId: string, accountIndex: number): string => {
  return `#${accountIndex + 1} (${accountId.slice(0, 6)}...)`;
};

const sortAccountsByBalanceDesc = (accounts: MonobankAccount[]): MonobankAccount[] => {
  return [...accounts].sort((left, right) => {
    const rightBalance = typeof right.balance === "number" && Number.isFinite(right.balance) ? right.balance : 0;
    const leftBalance = typeof left.balance === "number" && Number.isFinite(left.balance) ? left.balance : 0;
    return rightBalance - leftBalance;
  });
};

const emitStatus = (callback: ((status: StatusUpdate) => void) | undefined, status: StatusUpdate): void => {
  callback?.(status);
};

const emitProgress = (
  ctx: StatementFetchContext,
  accountId: string,
  accountIndex: number,
  accountsTotal: number,
  periodFrom: number,
  periodTo: number
): void => {
  if (!ctx.onProgress) {
    return;
  }

  ctx.onProgress({
    fetchedCount: ctx.progressById.size,
    periodFrom,
    periodTo,
    accountId,
    accountIndex,
    accountsTotal,
    transactionsSnapshot: sortTransactionsDesc(Array.from(ctx.progressById.values())),
  });
};

const waitForRateLimit = async (
  ctx: StatementFetchContext,
  nextRange: {
    from: number;
    to: number;
  }
): Promise<void> => {
  let remainingMs = Math.max(0, ctx.nextAllowedRequestAt - Date.now());
  if (remainingMs <= 0) {
    return;
  }

  while (remainingMs > 0) {
    const secondsRemaining = Math.ceil(remainingMs / 1000);
    const nextSyncMessage = `Наступна синхронізація ${formatSyncRange(nextRange.from, nextRange.to)} через ${secondsRemaining}`;

    const text = ctx.lastCompletedRange
      ? `Остання синхронізація: Аккаунт - ${ctx.lastCompletedRange.account}, ${formatSyncRange(ctx.lastCompletedRange.from, ctx.lastCompletedRange.to)} - ${formatTransactionCount(ctx.lastCompletedRange.fetchedCount)}. ${nextSyncMessage}`
      : nextSyncMessage;

    emitStatus(ctx.onStatus, {
      level: "info",
      text,
    });

    await sleep(Math.min(1_000, remainingMs));
    remainingMs = Math.max(0, ctx.nextAllowedRequestAt - Date.now());
  }
};

const waitForRetryAfterRateLimitError = async (ctx: StatementFetchContext): Promise<void> => {
  let remainingMs = Math.max(0, ctx.nextAllowedRequestAt - Date.now());
  if (remainingMs <= 0) {
    return;
  }

  while (remainingMs > 0) {
    const secondsRemaining = Math.ceil(remainingMs / 1000);
    emitStatus(ctx.onStatus, {
      level: "error",
      text: `Помилка синхронізації: Забагато запитів. Не оновлюйте браузер. Спробую через ${secondsRemaining} секунд`,
    });

    await sleep(Math.min(1_000, remainingMs));
    remainingMs = Math.max(0, ctx.nextAllowedRequestAt - Date.now());
  }
};

const requestStatementWithRateLimit = async (
  ctx: StatementFetchContext,
  accountId: string,
  accountLabel: string,
  from: number,
  to: number
): Promise<MonobankStatementTransaction[]> => {
  while (true) {
    await waitForRateLimit(ctx, { from, to });

    try {
      const statement = await ctx.fetchStatement(ctx.token, accountId, from, to);
      ctx.nextAllowedRequestAt = Date.now() + ctx.requestIntervalMs;
      ctx.lastCompletedRange = {
        account: accountLabel,
        from,
        to,
        fetchedCount: statement.length,
      };
      return statement;
    } catch (error) {
      if (error instanceof MonobankApiError && error.status === 429) {
        ctx.nextAllowedRequestAt = Date.now() + ctx.requestIntervalMs;
        await waitForRetryAfterRateLimitError(ctx);
        continue;
      }

      throw error;
    }
  }
};

const fetchAccountTransactionsInPeriod = async (
  ctx: StatementFetchContext,
  accountId: string,
  accountLabel: string,
  accountIndex: number,
  accountsTotal: number,
  periodFrom: number,
  periodTo: number
): Promise<Transaction[]> => {
  if (periodFrom > periodTo) {
    return [];
  }

  emitStatus(ctx.onStatus, {
    level: "info",
    text: `Синхронізація: рахунок ${accountLabel}, період ${formatCompactDayMonth(periodFrom)}-${formatCompactDayMonth(periodTo)}`,
  });

  const collectedById = new Map<string, Transaction>();
  let queryFrom = periodFrom;
  let overflowRequestCount = 0;

  while (queryFrom <= periodTo) {
    overflowRequestCount += 1;
    if (overflowRequestCount > 2000) {
      break;
    }

    const batch = await requestStatementWithRateLimit(ctx, accountId, accountLabel, queryFrom, periodTo);
    const normalizedBatch = batch.map((raw) => normalizeTransaction(raw, accountId));

    normalizedBatch.forEach((tx) => {
      collectedById.set(tx.id, tx);
      ctx.progressById.set(tx.id, tx);
    });

    emitProgress(ctx, accountId, accountIndex, accountsTotal, periodFrom, periodTo);

    if (batch.length < MONOBANK_STATEMENT_LIMIT) {
      break;
    }

    const lastTransaction = batch.length > 0 ? batch[batch.length - 1] : undefined;
    const lastTransactionTime = lastTransaction?.time;
    if (typeof lastTransactionTime !== "number" || !Number.isFinite(lastTransactionTime)) {
      break;
    }

    const nextQueryFrom = Math.max(periodFrom, Math.min(periodTo, Math.floor(lastTransactionTime)));
    if (nextQueryFrom <= queryFrom) {
      const fallbackFrom = queryFrom + 1;
      if (fallbackFrom > periodTo) {
        break;
      }
      queryFrom = fallbackFrom;
      continue;
    }

    queryFrom = nextQueryFrom;
  }

  return dedupeTransactionsById(Array.from(collectedById.values()));
};

const buildDescendingPeriods = (
  anchorTo: number,
  lowerBound: number,
  maxPeriodSeconds: number
): Array<{ from: number; to: number }> => {
  if (anchorTo <= lowerBound) {
    return [];
  }

  const periods: Array<{ from: number; to: number }> = [];
  let cursorTo = anchorTo;

  while (cursorTo > lowerBound) {
    const cursorFrom = Math.max(lowerBound, cursorTo - maxPeriodSeconds);
    periods.push({ from: cursorFrom, to: cursorTo });
    cursorTo = cursorFrom - 1;
  }

  return periods;
};

const resolveOldestCachedAccountTransactionTime = (
  existingTransactions: Transaction[],
  accountId: string
): number | null => {
  let oldest: number | null = null;

  existingTransactions.forEach((transaction) => {
    if (transaction.accountId !== accountId) {
      return;
    }

    if (!Number.isFinite(transaction.time)) {
      return;
    }

    if (oldest === null || transaction.time < oldest) {
      oldest = transaction.time;
    }
  });

  return oldest;
};

export const resolveSyncWindow = (
  _existingTransactions: Transaction[],
  windowDays: number = DEFAULT_WINDOW_DAYS,
  nowUnixSeconds: number = Math.floor(Date.now() / 1000)
): SyncWindow => {
  const normalizedWindowDays = windowDays > 0 ? Math.floor(windowDays) : DEFAULT_WINDOW_DAYS;
  const lowerBound = nowUnixSeconds - normalizedWindowDays * DAY_SECONDS;
  return {
    from: lowerBound,
    to: nowUnixSeconds,
  };
};

export const mergeTransactionsByOrigin = (
  existingTransactions: Transaction[],
  fetchedTransactions: Transaction[],
  dataOrigin: DataOrigin
): { transactions: Transaction[]; stats: TransactionMergeStats } => {
  const uniqueFetched = sortTransactionsDesc(dedupeTransactionsById(fetchedTransactions));

  if (dataOrigin === "demo") {
    if (uniqueFetched.length === 0) {
      return {
        transactions: sortTransactionsDesc(existingTransactions),
        stats: {
          added: 0,
          updated: 0,
        },
      };
    }

    return {
      transactions: uniqueFetched,
      stats: {
        added: uniqueFetched.length,
        updated: 0,
      },
    };
  }

  if (dataOrigin === "imported" || dataOrigin === "real") {
    const existingById = new Set(existingTransactions.map((tx) => tx.id));
    const toAdd = uniqueFetched.filter((tx) => !existingById.has(tx.id));
    return {
      transactions: sortTransactionsDesc([...existingTransactions, ...toAdd]),
      stats: {
        added: toAdd.length,
        updated: 0,
      },
    };
  }

  return {
    transactions: sortTransactionsDesc(existingTransactions),
    stats: {
      added: 0,
      updated: 0,
    },
  };
};

export const syncMonobankTransactions = async ({
  token,
  clientInfo,
  existingTransactions,
  dataOrigin,
  onStatus,
  onProgress,
  windowDays = DEFAULT_WINDOW_DAYS,
  nextAllowedRequestAt = 0,
  requestIntervalMs = MONOBANK_MIN_REQUEST_INTERVAL_MS,
  fetchStatement = fetchMonobankStatement,
}: SyncMonobankTransactionsParams): Promise<SyncMonobankTransactionsResult> => {
  const syncWindow = resolveSyncWindow(existingTransactions, windowDays);
  const statementContext: StatementFetchContext = {
    token,
    onStatus,
    nextAllowedRequestAt,
    requestIntervalMs,
    fetchStatement,
    onProgress,
    progressById: new Map<string, Transaction>(),
  };

  emitStatus(onStatus, {
    level: "info",
    text: `Починаю підгрузку транзакцій за останні ${windowDays} днів...`,
  });

  const accounts = sortAccountsByBalanceDesc(Array.isArray(clientInfo.accounts) ? clientInfo.accounts : []);
  const fetchedByAccount: Transaction[] = [];

  for (let accountIndex = 0; accountIndex < accounts.length; accountIndex += 1) {
    const account = accounts[accountIndex];
    const accountLabel = resolveAccountLabel(account.id, accountIndex);
    const oldestCachedAccountTransactionTime = resolveOldestCachedAccountTransactionTime(
      existingTransactions,
      account.id
    );

    const accountAnchorTo = Math.min(oldestCachedAccountTransactionTime ?? syncWindow.to, syncWindow.to);
    if (accountAnchorTo <= syncWindow.from) {
      continue;
    }

    const accountPeriods = buildDescendingPeriods(
      accountAnchorTo,
      syncWindow.from,
      MAX_STATEMENT_PERIOD_SECONDS
    );

    for (let periodIndex = 0; periodIndex < accountPeriods.length; periodIndex += 1) {
      const period = accountPeriods[periodIndex];
      const accountTransactions = await fetchAccountTransactionsInPeriod(
        statementContext,
        account.id,
        accountLabel,
        accountIndex,
        accounts.length,
        period.from,
        period.to
      );
      fetchedByAccount.push(...accountTransactions);
    }
  }

  const merged = mergeTransactionsByOrigin(existingTransactions, fetchedByAccount, dataOrigin);
  emitStatus(onStatus, {
    level: "success",
    text: `Синхронізацію завершено: нових ${merged.stats.added}, оновлено ${merged.stats.updated}, всього ${merged.transactions.length}`,
  });

  return {
    transactions: merged.transactions,
    fetchedTransactions: fetchedByAccount.length,
    mergeStats: merged.stats,
    syncWindow,
    nextAllowedRequestAt: statementContext.nextAllowedRequestAt,
  };
};
