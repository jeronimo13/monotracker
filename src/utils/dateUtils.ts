import type { Transaction } from "../types";

export interface DateRange {
  min: number;
  max: number;
}

export interface DatePreset {
  label: string;
  getValue: (minDate: number, maxDate: number) => { start: number; end: number };
}

export const calculateDateRange = (transactions: Transaction[]): DateRange => {
  if (transactions.length === 0) {
    const now = Math.floor(Date.now() / 1000);
    return { min: now, max: now };
  }

  const timestamps = transactions.map(tx => tx.time);
  return {
    min: Math.min(...timestamps),
    max: Math.max(...timestamps),
  };
};

export const getDatePresets = (): DatePreset[] => {
  const now = Math.floor(Date.now() / 1000);
  const dayInSeconds = 24 * 60 * 60;

  return [
    {
      label: "Останні 7 днів",
      getValue: () => ({
        start: now - (7 * dayInSeconds),
        end: now,
      }),
    },
    {
      label: "Останні 30 днів",
      getValue: () => ({
        start: now - (30 * dayInSeconds),
        end: now,
      }),
    },
    {
      label: "Останні 3 місяці",
      getValue: () => ({
        start: now - (90 * dayInSeconds),
        end: now,
      }),
    },
    {
      label: "Весь час",
      getValue: (minDate: number, maxDate: number) => ({
        start: minDate,
        end: maxDate,
      }),
    },
  ];
};

export const formatDateForInput = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toISOString().split('T')[0];
};

export const parseInputDate = (dateString: string): number => {
  return Math.floor(new Date(dateString).getTime() / 1000);
};
