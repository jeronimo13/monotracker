export const formatAmount = (amount: number) => {
  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "UAH",
    minimumFractionDigits: 2,
  }).format(amount / 100);
};

export const formatOriginalAmount = (amount: number) => {
  return new Intl.NumberFormat("uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
};

export const formatDate = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleTimeString("uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDateTime = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDateHeader = (dateKey: string) => {
  const date = new Date(dateKey);
  const weekday = date.toLocaleDateString("uk-UA", { weekday: "long" });
  const month = date.toLocaleDateString("uk-UA", { month: "long" });
  const day = date.getDate();
  const year = date.getFullYear();

  return `${weekday}, ${day} ${month} ${year} р.`;
};

export const getCurrencyCode = (code: number) => {
  switch (code) {
    case 980:
      return "₴";
    case 840:
      return "$";
    case 978:
      return "€";
    default:
      return code.toString();
  }
};

export const getTransactionLabel = (count: number) => {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `Показано ${count} транзакцій`;
  } else if (lastDigit === 1) {
    return `Показана ${count} транзакція`;
  } else if (lastDigit >= 2 && lastDigit <= 4) {
    return `Показано ${count} транзакції`;
  } else {
    return `Показано ${count} транзакцій`;
  }
};

export const formatCompactAmount = (amount: number) => {
  const absAmount = Math.abs(amount / 100); // Convert from kopiyky to hryvnia
  
  if (absAmount >= 1000000) {
    return `${(absAmount / 1000000).toFixed(1)}М`;
  } else if (absAmount >= 1000) {
    return `${(absAmount / 1000).toFixed(1)} тис.`;
  } else {
    return `${absAmount.toFixed(0)}`;
  }
};
