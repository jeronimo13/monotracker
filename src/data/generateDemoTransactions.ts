import type { Transaction } from "../types";
import demoTransactions from "./demo-transactions.json";

interface DemoTemplate {
  description: string;
  mcc: number;
  category: string;
  kind: "income" | "expense";
  minAmount: number;
  maxAmount: number;
  comment: string;
  cashbackBps: number;
}

interface DemoTransactionsFile {
  templates: DemoTemplate[];
}

const DEMO_DAYS = 30;
const MIN_TRANSACTIONS_PER_DAY = 3;
const MAX_TRANSACTIONS_PER_DAY = 6;
const UAH_CURRENCY_CODE = 980;
const DAY_MS = 24 * 60 * 60 * 1000;

const toUInt32 = (value: number): number => value >>> 0;

const createRng = (seed: number) => {
  let state = toUInt32(seed);

  return {
    next: (): number => {
      state = toUInt32((state * 1664525 + 1013904223) % 4294967296);
      return state / 4294967296;
    },
    int: (min: number, max: number): number => {
      return Math.floor((max - min + 1) * (state = toUInt32((state * 1664525 + 1013904223) % 4294967296), state / 4294967296)) + min;
    },
  };
};

const toDayStart = (date: Date): number => {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
};

const makeReceiptId = (id: string, hasValue: boolean): string => (hasValue ? `receipt_${id}` : "");
const makeInvoiceId = (id: string, hasValue: boolean): string => (hasValue ? `invoice_${id}` : "");

export const generateDemoTransactions = (baseDate: Date = new Date()): Transaction[] => {
  const templates = (demoTransactions as DemoTransactionsFile).templates;
  const todayStartMs = toDayStart(baseDate);
  const currentDayStamp = Math.floor(todayStartMs / DAY_MS);

  let balance = 1_800_000;
  let sequence = 0;
  const generated: Transaction[] = [];

  for (let dayOffset = DEMO_DAYS - 1; dayOffset >= 0; dayOffset -= 1) {
    const dayStamp = currentDayStamp - dayOffset;
    const dayStartMs = dayStamp * DAY_MS;
    const dayRng = createRng(dayStamp);
    const txCount = dayRng.int(MIN_TRANSACTIONS_PER_DAY, MAX_TRANSACTIONS_PER_DAY);

    for (let idx = 0; idx < txCount; idx += 1) {
      const template = templates[dayRng.int(0, templates.length - 1)];
      const amountAbs = dayRng.int(template.minAmount, template.maxAmount);
      const signedAmount = template.kind === "income" ? amountAbs : -amountAbs;
      const secondsFromDayStart = dayRng.int(7 * 3600, 22 * 3600 + 45 * 60);
      const time = Math.floor((dayStartMs + secondsFromDayStart * 1000) / 1000);
      const id = `${dayStamp}_${idx}_${sequence}`;
      const cashbackAmount =
        signedAmount < 0 && template.cashbackBps > 0
          ? Math.floor((Math.abs(signedAmount) * template.cashbackBps) / 10000)
          : 0;

      balance += signedAmount;

      generated.push({
        id,
        time,
        description: template.description,
        mcc: template.mcc,
        originalMcc: template.mcc,
        hold: false,
        amount: signedAmount,
        operationAmount: signedAmount,
        currencyCode: UAH_CURRENCY_CODE,
        commissionRate: 0,
        cashbackAmount,
        balance,
        comment: template.comment,
        receiptId: makeReceiptId(id, dayRng.next() > 0.5),
        invoiceId: makeInvoiceId(id, dayRng.next() > 0.8),
        counterEdrpou: template.kind === "income" ? "12345678" : "",
        counterIban: template.kind === "income" ? "UA123456789012345678901234567" : "",
        category: template.category,
      });

      sequence += 1;
    }
  }

  generated.sort((a, b) => b.time - a.time);
  return generated;
};
