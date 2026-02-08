import type { ClientInfo } from "../types";

export interface MonobankStatementTransaction {
  id: string;
  time: number;
  description?: string;
  mcc?: number;
  originalMcc?: number;
  hold?: boolean;
  amount?: number;
  operationAmount?: number;
  currencyCode?: number;
  commissionRate?: number;
  cashbackAmount?: number;
  balance?: number;
  comment?: string;
  receiptId?: string;
  invoiceId?: string;
  counterEdrpou?: string;
  counterIban?: string;
  category?: string;
}

export class MonobankApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MonobankApiError";
    this.status = status;
  }
}

const MONOBANK_API_BASE = "https://api.monobank.ua";

const mapStatusToMessage = (status: number): string => {
  switch (status) {
    case 400:
      return "Невірний запит до Monobank API.";
    case 401:
      return "Недійсний токен. Перевірте токен Monobank.";
    case 403:
      return "Monobank API відхилив доступ для цього токена.";
    case 404:
      return "Дані не знайдено в Monobank API.";
    case 429:
      return "Забагато запитів. Не оновлюйте браузер.";
    default:
      return `Помилка Monobank API: ${status}`;
  }
};

const assertOk = (response: Response): void => {
  if (response.ok) {
    return;
  }

  throw new MonobankApiError(mapStatusToMessage(response.status), response.status);
};

export const fetchMonobankClientInfo = async (token: string): Promise<ClientInfo> => {
  const response = await fetch(`${MONOBANK_API_BASE}/personal/client-info`, {
    headers: {
      "X-Token": token,
    },
  });

  assertOk(response);
  const data = (await response.json()) as ClientInfo;
  return data;
};

export const fetchMonobankStatement = async (
  token: string,
  accountId: string,
  fromUnixSeconds: number,
  toUnixSeconds: number
): Promise<MonobankStatementTransaction[]> => {
  const response = await fetch(
    `${MONOBANK_API_BASE}/personal/statement/${accountId}/${fromUnixSeconds}/${toUnixSeconds}`,
    {
      headers: {
        "X-Token": token,
      },
    }
  );

  assertOk(response);
  const data = (await response.json()) as MonobankStatementTransaction[];
  return Array.isArray(data) ? data : [];
};
