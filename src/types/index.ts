export interface Transaction {
  id: string;
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

export interface StoredData {
  token: string;
  transactions: Transaction[];
  timestamp: number;
  useRealData: boolean;
  categories: { [key: string]: string };
}

export interface Filters {
  description: string;
  mcc: string;
  mccCodes: string[]; // New: multiple MCC support
  category: string;
  categories: string[]; // New: multiple category support
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
