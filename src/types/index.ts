export interface Transaction {
  id: string;
  accountId: string;
  time: number;
  description: string;
  mcc: number;
  originalMcc: number;
  hold: boolean;
  amount: number;
  operationAmount: number;
  currencyCode: number;
  commissionRate: number;
  cashbackAmount: number;
  balance: number;
  comment: string;
  receiptId: string;
  invoiceId: string;
  counterEdrpou: string;
  counterIban: string;
  category?: string;
}

export type DataOrigin = "demo" | "real" | "imported";
export type AccountSource = "onboarding" | "settings";
export type SyncStatus = "idle" | "syncing" | "cooldown" | "error";
export type StatusLevel = "info" | "success" | "error";

export interface StatusUpdate {
  level: StatusLevel;
  text: string;
}

export interface MonobankAccount {
  id: string;
  type: string;
  currencyCode: number;
  cashbackType?: string;
  balance?: number;
  creditLimit?: number;
  maskedPan?: string[];
  iban: string;
}

export interface ClientInfo {
  clientId: string;
  name: string;
  webHookUrl?: string;
  permissions?: string;
  accounts: MonobankAccount[];
}

export interface AccountSourceInfo {
  source: AccountSource;
  addedAt: number;
}

export type AccountSourceMap = Record<string, AccountSourceInfo>;

export interface SyncState {
  status: SyncStatus;
  windowDays: number;
  needsInitialSync: boolean;
  lastSyncStartedAt?: number;
  lastSyncFinishedAt?: number;
  lastSuccessfulSyncAt?: number;
  nextAllowedRequestAt?: number;
  lastError?: string;
}

export interface StoredData {
  token: string;
  transactions: Transaction[];
  timestamp: number;
  useRealData: boolean;
  categories: { [key: string]: string };
  clientInfo?: ClientInfo | null;
  dataOrigin?: DataOrigin;
  accountSourceMap?: AccountSourceMap;
  sync?: SyncState;
}

export interface Filters {
  description: string;
  mcc: string;
  mccCodes: string[]; // New: multiple MCC support
  category: string;
  categories: string[]; // New: multiple category support
  source: string;
  search: string;
}

export interface Rule {
  id: string;
  name: string;
  category: string;
  condition: (transaction: Transaction) => boolean;
  explanation: string; // Why this rule applies
}

export interface AppExport {
  transactions: Transaction[];
  categories: { [key: string]: string };
  rules: Rule[];
}
