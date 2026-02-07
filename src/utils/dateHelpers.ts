export const getDateKey = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  return date.toDateString(); // Returns date without time
};

export const getMonthName = (monthIndex: number, year: number): string => {
  const monthNames = [
    "Січень",
    "Лютий",
    "Березень",
    "Квітень",
    "Травень",
    "Червень",
    "Липень",
    "Серпень",
    "Вересень",
    "Жовтень",
    "Листопад",
    "Грудень",
  ];
  return `${monthNames[monthIndex]} ${year}`;
};

export const calculateMonthPeriods = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const periods = [];

  // 1. Current month: [start of current month, now]
  const startOfCurrentMonth = new Date(currentYear, now.getMonth(), 1);
  periods.push({
    name: "Поточний місяць",
    from: Math.floor(startOfCurrentMonth.getTime() / 1000),
    to: Math.floor(now.getTime() / 1000),
    monthKey: `${currentYear}-${now.getMonth() + 1}`,
  });

  // 2. Previous months: [start of month, end of month]
  for (let month = now.getMonth() - 1; month >= 0; month--) {
    const startOfMonth = new Date(currentYear, month, 1);
    const endOfMonth = new Date(currentYear, month + 1, 0, 23, 59, 59);

    periods.push({
      name: getMonthName(month, currentYear),
      from: Math.floor(startOfMonth.getTime() / 1000),
      to: Math.floor(endOfMonth.getTime() / 1000),
      monthKey: `${currentYear}-${month + 1}`,
    });
  }

  return periods;
};
