export interface ParsedDateRange {
  start: number;
  end: number;
  display: string;
}

export interface DateRangePreset {
  label: string;
  value: string;
  shorthand: string;
}

type RelativeUnit = "d" | "w" | "m" | "y";

const pluralizeUk = (
  amount: number,
  one: string,
  few: string,
  many: string
): string => {
  const mod10 = amount % 10;
  const mod100 = amount % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

const formatRelativeDisplay = (amount: number, unit: RelativeUnit): string => {
  if (amount === 1) {
    if (unit === "d") return "Останній день";
    if (unit === "w") return "Останній тиждень";
    if (unit === "m") return "Останній місяць";
    return "Останній рік";
  }

  if (unit === "d") return `Останні ${amount} ${pluralizeUk(amount, "день", "дні", "днів")}`;
  if (unit === "w") return `Останні ${amount} ${pluralizeUk(amount, "тиждень", "тижні", "тижнів")}`;
  if (unit === "m") return `Останні ${amount} ${pluralizeUk(amount, "місяць", "місяці", "місяців")}`;
  return `Останні ${amount} ${pluralizeUk(amount, "рік", "роки", "років")}`;
};

const parseRelativeUnit = (unit: string): RelativeUnit | null => {
  const unitMap: Record<string, RelativeUnit> = {
    d: "d",
    day: "d",
    days: "d",
    день: "d",
    дні: "d",
    днів: "d",
    w: "w",
    week: "w",
    weeks: "w",
    тиждень: "w",
    тижні: "w",
    тижнів: "w",
    m: "m",
    month: "m",
    months: "m",
    місяць: "m",
    місяці: "m",
    місяців: "m",
    y: "y",
    year: "y",
    years: "y",
    рік: "y",
    роки: "y",
    років: "y",
  };

  return unitMap[unit] ?? null;
};

export const getDateRangePresets = (): DateRangePreset[] => [
  { label: "Останній день", value: "1d", shorthand: "1D" },
  { label: "Останні 3 дні", value: "3d", shorthand: "3D" },
  { label: "Останній тиждень", value: "1w", shorthand: "1W" },
  { label: "Останні 2 тижні", value: "2w", shorthand: "2W" },
  { label: "Останній місяць", value: "1m", shorthand: "1M" },
  { label: "Останні 3 місяці", value: "3m", shorthand: "3M" },
  { label: "Останні 6 місяців", value: "6m", shorthand: "6M" },
  { label: "Останній рік", value: "1y", shorthand: "1Y" },
];

export const parseNaturalDateRange = (
  input: string
): ParsedDateRange | null => {
  if (!input.trim()) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  
  // Use now as reference point for relative dates
  const referenceDate = now;
  
  // Clean input
  const cleanInput = input.trim().toLowerCase();
  
  // Handle values that should clear the date range
  if (
    cleanInput === "all" ||
    cleanInput === "all time" ||
    cleanInput === "весь час" ||
    cleanInput === "увесь час" ||
    cleanInput === "за весь час" ||
    cleanInput === "за увесь час"
  ) {
    return null;
  }

  // Parse relative time patterns like "7d", "2w", "3m", "1y"
  const relativeMatch = cleanInput.match(/^(\d+)\s*([dwmy])$/);
  if (relativeMatch) {
    const [, amountStr, unit] = relativeMatch;
    const amount = parseInt(amountStr);

    let daysToSubtract = 0;
    
    switch (unit) {
      case 'd':
        daysToSubtract = amount - 1; // For X days, go back X-1 days (include today)
        break;
      case 'w':
        daysToSubtract = (amount * 7) - 1; // For X weeks, go back (X*7)-1 days
        break;
      case 'm':
        daysToSubtract = (amount * 30) - 1; // For X months, go back (X*30)-1 days
        break;
      case 'y':
        daysToSubtract = (amount * 365) - 1; // For X years, go back (X*365)-1 days
        break;
    }
    
    // Align dates to day boundaries for cleaner ranges
    const referenceDateObj = new Date(referenceDate * 1000);
    
    // Set end to end of reference date (23:59:59)
    const endOfReferenceDay = new Date(referenceDateObj.getFullYear(), referenceDateObj.getMonth(), referenceDateObj.getDate(), 23, 59, 59);
    const endTimestamp = Math.floor(endOfReferenceDay.getTime() / 1000);
    
    // Calculate start date and set to beginning of that day (00:00:00)
    const startDateObj = new Date(referenceDateObj);
    startDateObj.setDate(startDateObj.getDate() - daysToSubtract);
    const startOfDay = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate(), 0, 0, 0);
    const startTimestamp = Math.floor(startOfDay.getTime() / 1000);
    
    const start = startTimestamp;
    const end = endTimestamp;
    
    return {
      start,
      end,
      display: formatRelativeDisplay(amount, unit as RelativeUnit)
    };
  }

  // Parse date range like "2024-01-01 to 2024-01-31" or "2024-01-01..2024-01-31"
  const rangeMatch = cleanInput.match(/(\d{4}-\d{2}-\d{2})[\s]*(to|до|\.\.|–)[\s]*(\d{4}-\d{2}-\d{2})/);
  if (rangeMatch) {
    const [, startDateStr, , endDateStr] = rangeMatch;
    
    try {
      const startTimestamp = Math.floor(new Date(startDateStr).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endDateStr + "T23:59:59").getTime() / 1000);
      
      if (!isNaN(startTimestamp) && !isNaN(endTimestamp)) {
        return {
          start: startTimestamp,
          end: endTimestamp,
          display: `${startDateStr} до ${endDateStr}`
        };
      }
    } catch {
      // Invalid date format
    }
  }

  // Parse single date like "2024-01-01" (treats as that day)
  const singleDateMatch = cleanInput.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (singleDateMatch) {
    const [, dateStr] = singleDateMatch;
    
    try {
      const startTimestamp = Math.floor(new Date(dateStr).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(dateStr + "T23:59:59").getTime() / 1000);
      
      if (!isNaN(startTimestamp) && !isNaN(endTimestamp)) {
        return {
          start: startTimestamp,
          end: endTimestamp,
          display: dateStr
        };
      }
    } catch {
      // Invalid date format
    }
  }

  // Parse natural language like "last 3 days", "past 2 weeks", "останні 3 дні"
  const naturalMatch = cleanInput.match(
    /(?:last|past|останні|остання|останній|за\s+останні|за\s+останній)\s+(\d+)\s+(day|days|week|weeks|month|months|year|years|день|дні|днів|тиждень|тижні|тижнів|місяць|місяці|місяців|рік|роки|років)/
  );
  if (naturalMatch) {
    const [, amountStr, unit] = naturalMatch;
    const amount = parseInt(amountStr);
    
    const parsedUnit = parseRelativeUnit(unit);
    if (!parsedUnit) {
      return null;
    }

    const daysPerUnit: Record<RelativeUnit, number> = {
      d: 1,
      w: 7,
      m: 30,
      y: 365,
    };
    
    // Align dates to day boundaries for cleaner ranges
    const referenceDateObj = new Date(referenceDate * 1000);
    
    // Set end to end of reference date (23:59:59)
    const endOfReferenceDay = new Date(referenceDateObj.getFullYear(), referenceDateObj.getMonth(), referenceDateObj.getDate(), 23, 59, 59);
    const endTimestamp = Math.floor(endOfReferenceDay.getTime() / 1000);
    
    // Calculate start date and set to beginning of that day (00:00:00)
    const startDateObj = new Date(referenceDateObj);
    const dayCount = amount * daysPerUnit[parsedUnit];
    startDateObj.setDate(startDateObj.getDate() - (dayCount - 1));
    const startOfDay = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate(), 0, 0, 0);
    const startTimestamp = Math.floor(startOfDay.getTime() / 1000);
    
    const start = startTimestamp;
    const end = endTimestamp;
    
    return {
      start,
      end,
      display: formatRelativeDisplay(amount, parsedUnit)
    };
  }

  return null;
};

export const formatDateRangeForDisplay = (start: number, end: number): string => {
  const now = Math.floor(Date.now() / 1000);
  const dayInSeconds = 24 * 60 * 60;
  
  // Check if it's a "last X" pattern (end is approximately now)
  if (end >= now - dayInSeconds && end <= now + dayInSeconds) {
    const diffSeconds = now - start;
    const days = Math.round(diffSeconds / dayInSeconds);
    
    if (days === 1) return "Останній день";
    if (days === 7) return "Останній тиждень";
    if (days === 14) return "Останні 2 тижні";
    if (days === 30) return "Останній місяць";
    if (days === 90) return "Останні 3 місяці";
    if (days === 180) return "Останні 6 місяців";
    if (days === 365) return "Останній рік";
    
    if (days < 30) return `Останні ${days} ${pluralizeUk(days, "день", "дні", "днів")}`;
    if (days < 365) {
      const months = Math.round(days / 30);
      return `Останні ${months} ${pluralizeUk(months, "місяць", "місяці", "місяців")}`;
    }
    const years = Math.round(days / 365);
    return `Останні ${years} ${pluralizeUk(years, "рік", "роки", "років")}`;
  }

  // Default to date range format
  const startDate = new Date(start * 1000).toISOString().split('T')[0];
  const endDate = new Date(end * 1000).toISOString().split('T')[0];
  
  if (startDate === endDate) {
    return startDate;
  }
  
  return `${startDate} до ${endDate}`;
};
