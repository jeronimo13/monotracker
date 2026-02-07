import type { Transaction } from "../types";
import { getMonthName } from "./dateHelpers";

export interface MonthlyData {
  monthKey: string;
  monthName: string;
  year: number;
  month: number;
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  transactionCount: number;
  categoryBreakdown: { [category: string]: CategoryData };
  daysInMonth: number;
  daysCompleted: number;
}

export interface CategoryData {
  income: number;
  expenses: number;
  netAmount: number;
  transactionCount: number;
  averageTransaction: number;
}

export interface MonthlyInsight {
  type: 'trend' | 'anomaly' | 'seasonal' | 'budget';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  value?: number;
  comparison?: number;
}

export const getMonthKey = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return `${date.getFullYear()}-${date.getMonth() + 1}`;
};

export const aggregateTransactionsByMonth = (transactions: Transaction[]): MonthlyData[] => {
  const monthlyMap = new Map<string, MonthlyData>();

  transactions.forEach(transaction => {
    const date = new Date(transaction.time * 1000);
    const monthKey = getMonthKey(transaction.time);
    const year = date.getFullYear();
    const month = date.getMonth();
    
    if (!monthlyMap.has(monthKey)) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const now = new Date();
      const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
      const daysCompleted = isCurrentMonth ? now.getDate() : daysInMonth;
      
      monthlyMap.set(monthKey, {
        monthKey,
        monthName: getMonthName(month, year),
        year,
        month,
        totalIncome: 0,
        totalExpenses: 0,
        netAmount: 0,
        transactionCount: 0,
        categoryBreakdown: {},
        daysInMonth,
        daysCompleted,
      });
    }

    const monthData = monthlyMap.get(monthKey)!;
    const category = transaction.category || 'Без категорії';
    
    if (!monthData.categoryBreakdown[category]) {
      monthData.categoryBreakdown[category] = {
        income: 0,
        expenses: 0,
        netAmount: 0,
        transactionCount: 0,
        averageTransaction: 0,
      };
    }

    const amount = transaction.amount;
    const categoryData = monthData.categoryBreakdown[category];

    if (amount > 0) {
      monthData.totalIncome += amount;
      categoryData.income += amount;
    } else {
      monthData.totalExpenses += Math.abs(amount);
      categoryData.expenses += Math.abs(amount);
    }

    monthData.netAmount += amount;
    monthData.transactionCount++;
    categoryData.netAmount += amount;
    categoryData.transactionCount++;
  });

  // Calculate averages
  monthlyMap.forEach(monthData => {
    Object.values(monthData.categoryBreakdown).forEach(categoryData => {
      categoryData.averageTransaction = categoryData.transactionCount > 0 
        ? categoryData.netAmount / categoryData.transactionCount 
        : 0;
    });
  });

  return Array.from(monthlyMap.values()).sort((a, b) => 
    `${b.year}-${b.month.toString().padStart(2, '0')}`.localeCompare(
      `${a.year}-${a.month.toString().padStart(2, '0')}`
    )
  );
};

export const calculateMonthlyInsights = (monthlyData: MonthlyData[]): MonthlyInsight[] => {
  if (monthlyData.length < 2) return [];

  const insights: MonthlyInsight[] = [];
  const currentMonth = monthlyData[0];
  const previousMonth = monthlyData[1];
  
  // Month-over-month spending change
  if (previousMonth) {
    const expenseChange = ((currentMonth.totalExpenses - previousMonth.totalExpenses) / previousMonth.totalExpenses) * 100;
    
    if (Math.abs(expenseChange) > 20) {
      insights.push({
        type: 'trend',
        severity: expenseChange > 50 ? 'critical' : 'warning',
        message: `Витрати ${expenseChange > 0 ? 'зросли' : 'зменшилися'} на ${Math.abs(expenseChange).toFixed(1)}% порівняно з попереднім місяцем`,
        value: expenseChange,
        comparison: previousMonth.totalExpenses,
      });
    }
  }

  // Current month spending pace
  if (currentMonth.daysCompleted < currentMonth.daysInMonth) {
    const dailyAverage = currentMonth.totalExpenses / currentMonth.daysCompleted;
    const projectedMonthlyExpenses = dailyAverage * currentMonth.daysInMonth;
    const averageMonthlyExpenses = monthlyData.slice(1, 4).reduce((sum, month) => sum + month.totalExpenses, 0) / Math.min(3, monthlyData.length - 1);
    
    const projectedVsAverage = ((projectedMonthlyExpenses - averageMonthlyExpenses) / averageMonthlyExpenses) * 100;
    
    if (Math.abs(projectedVsAverage) > 15) {
      insights.push({
        type: 'budget',
        severity: projectedVsAverage > 30 ? 'critical' : 'warning',
        message: `За поточними темпами ви ${projectedVsAverage > 0 ? 'перевитратите' : 'зекономите'} ${Math.abs(projectedVsAverage).toFixed(1)}% від середньомісячних витрат`,
        value: projectedMonthlyExpenses,
        comparison: averageMonthlyExpenses,
      });
    }
  }

  // Category anomalies
  Object.entries(currentMonth.categoryBreakdown).forEach(([category, data]) => {
    const categoryHistory = monthlyData.slice(1, 4).map(month => 
      month.categoryBreakdown[category]?.expenses || 0
    ).filter(expense => expense > 0);
    
    if (categoryHistory.length >= 2) {
      const averageExpense = categoryHistory.reduce((sum, expense) => sum + expense, 0) / categoryHistory.length;
      const change = ((data.expenses - averageExpense) / averageExpense) * 100;
      
      if (change > 100 && data.expenses > 1000) { // More than double and significant amount
        insights.push({
          type: 'anomaly',
          severity: 'warning',
          message: `Витрати на "${category}" зросли на ${change.toFixed(0)}% порівняно із середнім`,
          value: data.expenses,
          comparison: averageExpense,
        });
      }
    }
  });

  return insights.slice(0, 5); // Limit to 5 most important insights
};

export const calculateSpendingVelocity = (monthlyData: MonthlyData[]): {
  currentPace: number;
  projectedTotal: number;
  daysRemaining: number;
} => {
  const currentMonth = monthlyData[0];
  if (!currentMonth || currentMonth.daysCompleted >= currentMonth.daysInMonth) {
    return { currentPace: 0, projectedTotal: currentMonth?.totalExpenses || 0, daysRemaining: 0 };
  }

  const currentPace = currentMonth.totalExpenses / currentMonth.daysCompleted;
  const daysRemaining = currentMonth.daysInMonth - currentMonth.daysCompleted;
  const projectedTotal = currentMonth.totalExpenses + (currentPace * daysRemaining);

  return {
    currentPace,
    projectedTotal,
    daysRemaining,
  };
};