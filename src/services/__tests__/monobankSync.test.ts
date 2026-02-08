import type { ClientInfo, Transaction } from "../../types";
import { MonobankApiError, type MonobankStatementTransaction } from "../monobankApi";
import {
  MONOBANK_STATEMENT_LIMIT,
  MONOBANK_STATEMENT_MAX_PERIOD_DAYS,
  resolveSyncWindow,
  syncMonobankTransactions,
} from "../monobankSync";

const NOW_UNIX = 1_700_000_000;
const DAY_SECONDS = 24 * 60 * 60;

const createClientInfo = (accounts?: ClientInfo["accounts"]): ClientInfo => ({
  clientId: "client-1",
  name: "Test Client",
  accounts:
    accounts ??
    [
      {
        id: "account-1",
        type: "black",
        currencyCode: 980,
        iban: "UA123456789012345678901234567",
        balance: 100_000,
        maskedPan: ["4444********1111"],
      },
    ],
});

const createStatementTx = (id: string, time: number, amount: number): MonobankStatementTransaction => ({
  id,
  time,
  description: `TX ${id}`,
  mcc: 5411,
  originalMcc: 5411,
  hold: false,
  amount,
  operationAmount: amount,
  currencyCode: 980,
  commissionRate: 0,
  cashbackAmount: 0,
  balance: 100_000,
  comment: "",
  receiptId: "",
  invoiceId: "",
  counterEdrpou: "",
  counterIban: "",
});

const createLocalTx = (id: string, accountId: string, time: number, amount: number): Transaction => ({
  id,
  accountId,
  time,
  description: `Local ${id}`,
  mcc: 5411,
  originalMcc: 5411,
  hold: false,
  amount,
  operationAmount: amount,
  currencyCode: 980,
  commissionRate: 0,
  cashbackAmount: 0,
  balance: 100_000,
  comment: "",
  receiptId: "",
  invoiceId: "",
  counterEdrpou: "",
  counterIban: "",
});

describe("resolveSyncWindow", () => {
  test("returns full requested window when no local transactions", () => {
    const window = resolveSyncWindow([], 365, NOW_UNIX);
    expect(window.from).toBe(NOW_UNIX - 365 * DAY_SECONDS);
    expect(window.to).toBe(NOW_UNIX);
  });

  test("does not narrow range by latest local transaction timestamp", () => {
    const window = resolveSyncWindow([createLocalTx("tx-1", "account-1", NOW_UNIX - 2 * DAY_SECONDS, -100)], 365, NOW_UNIX);

    expect(window.from).toBe(NOW_UNIX - 365 * DAY_SECONDS);
    expect(window.to).toBe(NOW_UNIX);
  });
});

describe("syncMonobankTransactions", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test("prioritizes account with the highest balance", async () => {
    const fetchStatement = jest
      .fn<Promise<MonobankStatementTransaction[]>, [string, string, number, number]>()
      .mockResolvedValue([]);

    const clientInfo = createClientInfo([
      {
        id: "account-low",
        type: "black",
        currencyCode: 980,
        iban: "UA-low",
        balance: 10_000,
      },
      {
        id: "account-high",
        type: "black",
        currencyCode: 980,
        iban: "UA-high",
        balance: 500_000,
      },
    ]);

    await syncMonobankTransactions({
      token: "token-1",
      clientInfo,
      existingTransactions: [],
      dataOrigin: "demo",
      windowDays: 1,
      requestIntervalMs: 0,
      fetchStatement,
    });

    expect(fetchStatement).toHaveBeenCalled();
    expect(fetchStatement.mock.calls[0][1]).toBe("account-high");
  });

  test("starts account sync from oldest cached transaction timestamp", async () => {
    jest.spyOn(Date, "now").mockReturnValue(NOW_UNIX * 1000);
    const fetchStatement = jest
      .fn<Promise<MonobankStatementTransaction[]>, [string, string, number, number]>()
      .mockResolvedValue([]);

    const oldestCachedTime = NOW_UNIX - 10 * DAY_SECONDS;
    await syncMonobankTransactions({
      token: "token-1",
      clientInfo: createClientInfo(),
      existingTransactions: [createLocalTx("cached-1", "account-1", oldestCachedTime, -100)],
      dataOrigin: "real",
      windowDays: 365,
      requestIntervalMs: 0,
      fetchStatement,
    });

    expect(fetchStatement).toHaveBeenCalled();
    const firstCall = fetchStatement.mock.calls[0];
    expect(firstCall[3]).toBe(oldestCachedTime);
    expect(firstCall[3] - firstCall[2]).toBeLessThanOrEqual(MONOBANK_STATEMENT_MAX_PERIOD_DAYS * DAY_SECONDS);
  });

  test("skips account when cache already reaches one-year lower bound", async () => {
    jest.spyOn(Date, "now").mockReturnValue(NOW_UNIX * 1000);
    const fetchStatement = jest
      .fn<Promise<MonobankStatementTransaction[]>, [string, string, number, number]>()
      .mockResolvedValue([]);

    const olderThanYear = NOW_UNIX - 370 * DAY_SECONDS;
    await syncMonobankTransactions({
      token: "token-1",
      clientInfo: createClientInfo(),
      existingTransactions: [createLocalTx("cached-1", "account-1", olderThanYear, -100)],
      dataOrigin: "real",
      windowDays: 365,
      requestIntervalMs: 0,
      fetchStatement,
    });

    expect(fetchStatement).not.toHaveBeenCalled();
  });

  test("fetches yearly window in descending periods when cache is empty", async () => {
    jest.spyOn(Date, "now").mockReturnValue(NOW_UNIX * 1000);
    const fetchStatement = jest
      .fn<Promise<MonobankStatementTransaction[]>, [string, string, number, number]>()
      .mockResolvedValue([]);

    await syncMonobankTransactions({
      token: "token-1",
      clientInfo: createClientInfo(),
      existingTransactions: [],
      dataOrigin: "demo",
      windowDays: 365,
      requestIntervalMs: 0,
      fetchStatement,
    });

    expect(fetchStatement.mock.calls.length).toBeGreaterThan(1);
    const [firstFrom, firstTo] = [fetchStatement.mock.calls[0][2], fetchStatement.mock.calls[0][3]];
    const [secondFrom, secondTo] = [fetchStatement.mock.calls[1][2], fetchStatement.mock.calls[1][3]];

    expect(firstTo).toBe(NOW_UNIX);
    expect(firstTo).toBeGreaterThan(secondTo);
    expect(firstFrom).toBeGreaterThan(secondFrom);
  });

  test("continues overflow window from last returned transaction timestamp", async () => {
    jest.spyOn(Date, "now").mockReturnValue(NOW_UNIX * 1000);

    let callCount = 0;
    let firstBatchLastTimestamp = 0;
    const fetchStatement = jest
      .fn<Promise<MonobankStatementTransaction[]>, [string, string, number, number]>()
      .mockImplementation(async (_token, _accountId, from, to) => {
        callCount += 1;
        if (callCount === 1) {
          const firstBatch = Array.from({ length: MONOBANK_STATEMENT_LIMIT }, (_, idx) =>
            createStatementTx(`root-${idx}`, to - idx, -(idx + 1) * 100)
          );
          firstBatchLastTimestamp = firstBatch.length > 0 ? firstBatch[firstBatch.length - 1].time : from;
          return firstBatch;
        }

        if (callCount === 2) {
          expect(from).toBe(firstBatchLastTimestamp);
          return [createStatementTx("tail-1", firstBatchLastTimestamp, -100)];
        }

        return [];
      });

    const result = await syncMonobankTransactions({
      token: "token-1",
      clientInfo: createClientInfo(),
      existingTransactions: [],
      dataOrigin: "demo",
      windowDays: 1,
      requestIntervalMs: 0,
      fetchStatement,
    });

    expect(fetchStatement).toHaveBeenCalledTimes(2);
    expect(result.transactions.some((tx) => tx.id === "tail-1")).toBe(true);
  });

  test("keeps imported snapshot records unchanged and only appends missing transactions", async () => {
    jest.spyOn(Date, "now").mockReturnValue(NOW_UNIX * 1000);
    const existingTransactions = [createLocalTx("dup", "account-1", NOW_UNIX - 100, -5000)];

    const fetchStatement = jest
      .fn<Promise<MonobankStatementTransaction[]>, [string, string, number, number]>()
      .mockResolvedValueOnce([
        createStatementTx("dup", NOW_UNIX - 100, -9999),
        createStatementTx("new-1", NOW_UNIX - 50, -1111),
      ]);

    const result = await syncMonobankTransactions({
      token: "token-1",
      clientInfo: createClientInfo(),
      existingTransactions,
      dataOrigin: "imported",
      windowDays: 1,
      requestIntervalMs: 0,
      fetchStatement,
    });

    const dupTx = result.transactions.find((tx) => tx.id === "dup");
    const newTx = result.transactions.find((tx) => tx.id === "new-1");

    expect(dupTx?.amount).toBe(-5000);
    expect(newTx).toBeTruthy();
    expect(result.mergeStats.added).toBe(1);
    expect(result.mergeStats.updated).toBe(0);
  });

  test("waits for next allowed request time and emits cooldown status", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-02-08T10:00:00.000Z"));

    const statuses: string[] = [];
    const fetchStatement = jest
      .fn<Promise<MonobankStatementTransaction[]>, [string, string, number, number]>()
      .mockResolvedValueOnce([]);

    const promise = syncMonobankTransactions({
      token: "token-1",
      clientInfo: createClientInfo(),
      existingTransactions: [],
      dataOrigin: "demo",
      windowDays: 1,
      nextAllowedRequestAt: Date.now() + 2_000,
      requestIntervalMs: 0,
      fetchStatement,
      onStatus: (status) => statuses.push(status.text),
    });

    expect(fetchStatement).toHaveBeenCalledTimes(0);
    await jest.advanceTimersByTimeAsync(2_000);
    await promise;

    expect(fetchStatement).toHaveBeenCalledTimes(1);
    expect(statuses.some((text) => text.includes("Наступна синхронізація"))).toBe(true);
    expect(statuses.some((text) => text.includes("через 2"))).toBe(true);
  });

  test("shows last and next sync windows during cooldown between paged requests", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-02-08T10:00:00.000Z"));

    const statuses: string[] = [];
    const limitBatch = Array.from({ length: MONOBANK_STATEMENT_LIMIT }, (_, idx) =>
      createStatementTx(`tx-${idx}`, NOW_UNIX - idx, -(idx + 1) * 100)
    );

    const fetchStatement = jest
      .fn<Promise<MonobankStatementTransaction[]>, [string, string, number, number]>()
      .mockResolvedValueOnce(limitBatch)
      .mockResolvedValueOnce([]);

    const promise = syncMonobankTransactions({
      token: "token-1",
      clientInfo: createClientInfo(),
      existingTransactions: [],
      dataOrigin: "demo",
      windowDays: 1,
      requestIntervalMs: 2_000,
      fetchStatement,
      onStatus: (status) => statuses.push(status.text),
    });

    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(2_000);
    await promise;

    expect(fetchStatement).toHaveBeenCalledTimes(2);
    expect(statuses.some((text) => text.includes("Остання синхронізація: Аккаунт - #1"))).toBe(true);
    expect(statuses.some((text) => text.includes("Наступна синхронізація"))).toBe(true);
  });

  test("retries after 429 with countdown message and without hard failure", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-02-08T10:00:00.000Z"));

    const statuses: string[] = [];
    const fetchStatement = jest
      .fn<Promise<MonobankStatementTransaction[]>, [string, string, number, number]>()
      .mockRejectedValueOnce(new MonobankApiError("Забагато запитів", 429))
      .mockResolvedValueOnce([]);

    const promise = syncMonobankTransactions({
      token: "token-1",
      clientInfo: createClientInfo(),
      existingTransactions: [],
      dataOrigin: "demo",
      windowDays: 1,
      requestIntervalMs: 2_000,
      fetchStatement,
      onStatus: (status) => statuses.push(status.text),
    });

    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(2_000);
    await promise;

    expect(fetchStatement).toHaveBeenCalledTimes(2);
    expect(
      statuses.some((text) =>
        text.includes("Помилка синхронізації: Забагато запитів. Не оновлюйте браузер. Спробую через")
      )
    ).toBe(true);
  });
});
