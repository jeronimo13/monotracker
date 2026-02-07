import React, { useMemo } from "react";
import type { Transaction } from "../types";
import { formatAmount } from "../utils/formatters";
import {
  aggregateTransactionsByMonth,
  calculateMonthlyInsights,
  calculateSpendingVelocity,
  type MonthlyInsight,
} from "../utils/monthlyAnalytics";
import SpendingTrendChart from "./charts/SpendingTrendChart";
import CategoryPieChart from "./charts/CategoryPieChart";
import TabSwitcher from "./TabSwitcher";

interface MonthlyBreakdownProps {
  transactions: Transaction[];
}

const MonthlyBreakdown: React.FC<MonthlyBreakdownProps> = ({ transactions }) => {
  const monthlyData = useMemo(
    () => aggregateTransactionsByMonth(transactions),
    [transactions]
  );

  const insights = useMemo(
    () => calculateMonthlyInsights(monthlyData),
    [monthlyData]
  );

  const spendingVelocity = useMemo(
    () => calculateSpendingVelocity(monthlyData),
    [monthlyData]
  );

  const currentMonth = monthlyData[0];
  const previousMonth = monthlyData[1];
  const [historyView, setHistoryView] = React.useState<string>("overview");

  if (monthlyData.length === 0) {
    return (
      <div className="px-6 py-8 text-center text-gray-500">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Недостатньо даних
        </h3>
        <p>Для аналізу потрібно більше транзакцій.</p>
      </div>
    );
  }

  const getSeverityColor = (severity: MonthlyInsight["severity"]) => {
    switch (severity) {
      case "critical":
        return "bg-red-50 border-red-200 text-red-800";
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      default:
        return "bg-blue-50 border-blue-200 text-blue-800";
    }
  };

  const getSeverityIcon = (severity: MonthlyInsight["severity"]) => {
    switch (severity) {
      case "critical":
        return "🚨";
      case "warning":
        return "⚠️";
      default:
        return "ℹ️";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          📊 Щомісячний аналіз
        </h2>
        <p className="text-gray-600">
          Аналіз ваших фінансових даних за {monthlyData.length} місяці(в)
        </p>
      </div>

      {/* Current Month Overview */}
      {currentMonth && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {currentMonth.monthName}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Доходи</div>
              <div className="text-xl font-bold text-green-800">
                {formatAmount(currentMonth.totalIncome)}
              </div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-sm text-red-600 font-medium">Витрати</div>
              <div className="text-xl font-bold text-red-800">
                {formatAmount(currentMonth.totalExpenses)}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 font-medium">Баланс</div>
              <div
                className={`text-xl font-bold ${
                  currentMonth.netAmount >= 0 ? "text-green-800" : "text-red-800"
                }`}
              >
                {formatAmount(currentMonth.netAmount)}
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">
                Транзакції
              </div>
              <div className="text-xl font-bold text-purple-800">
                {currentMonth.transactionCount}
              </div>
            </div>
          </div>

          {/* Month Progress */}
          {currentMonth.daysCompleted < currentMonth.daysInMonth && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-blue-900">
                  Прогрес місяця
                </span>
                <span className="text-sm text-blue-700">
                  День {currentMonth.daysCompleted} з {currentMonth.daysInMonth}
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      (currentMonth.daysCompleted / currentMonth.daysInMonth) * 100
                    }%`,
                  }}
                ></div>
              </div>
              <div className="mt-2 text-sm text-blue-700">
                Прогноз витрат на кінець місяця:{" "}
                <span className="font-semibold">
                  {formatAmount(spendingVelocity.projectedTotal)}
                </span>
              </div>
            </div>
          )}

          {/* Month-over-month comparison */}
          {previousMonth && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">
                  Зміна доходів (порівняно з попереднім місяцем)
                </div>
                <div
                  className={`text-lg font-semibold ${
                    currentMonth.totalIncome >= previousMonth.totalIncome
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {(() => {
                    if (previousMonth.totalIncome === 0 && currentMonth.totalIncome === 0) {
                      return "Без змін";
                    }
                    if (previousMonth.totalIncome === 0) {
                      return currentMonth.totalIncome > 0 ? "Нові доходи" : "Без змін";
                    }
                    const change = ((currentMonth.totalIncome - previousMonth.totalIncome) / previousMonth.totalIncome) * 100;
                    return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
                  })()}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">
                  Зміна витрат (порівняно з попереднім місяцем)
                </div>
                <div
                  className={`text-lg font-semibold ${
                    currentMonth.totalExpenses <= previousMonth.totalExpenses
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {(() => {
                    if (previousMonth.totalExpenses === 0 && currentMonth.totalExpenses === 0) {
                      return "Без змін";
                    }
                    if (previousMonth.totalExpenses === 0) {
                      return currentMonth.totalExpenses > 0 ? "Нові витрати" : "Без змін";
                    }
                    const change = ((currentMonth.totalExpenses - previousMonth.totalExpenses) / previousMonth.totalExpenses) * 100;
                    return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Smart Insights */}
      {insights.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            💡 Розумні підказки
          </h3>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getSeverityColor(
                  insight.severity
                )}`}
              >
                <div className="flex items-start space-x-2">
                  <span className="text-lg">
                    {getSeverityIcon(insight.severity)}
                  </span>
                  <p className="flex-1 text-sm">{insight.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Trend Chart */}
      {monthlyData.length >= 2 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <SpendingTrendChart monthlyData={monthlyData} />
        </div>
      )}

      {/* Category Breakdown */}
      {currentMonth && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Pie Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {Object.keys(currentMonth.categoryBreakdown).length > 1 ? (
              <CategoryPieChart categoryBreakdown={currentMonth.categoryBreakdown} />
            ) : Object.keys(currentMonth.categoryBreakdown).length === 1 ? (
              <div className="h-64 w-full flex flex-col items-center justify-center text-gray-500">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Одна категорія
                </h3>
                <p className="text-center mb-4">
                  Всі транзакції відносяться до категорії:<br />
                  <strong>{Object.keys(currentMonth.categoryBreakdown)[0]}</strong>
                </p>
                <div className="text-2xl font-bold text-red-600">
                  -{formatAmount(Object.values(currentMonth.categoryBreakdown)[0].expenses)}
                </div>
              </div>
            ) : (
              <div className="h-64 w-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-2">📊</div>
                  <p>Немає витрат для відображення</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Category List */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📋 Деталі по категоріях
            </h3>
            {Object.keys(currentMonth.categoryBreakdown).length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {Object.entries(currentMonth.categoryBreakdown)
                  .sort(([, a], [, b]) => b.expenses - a.expenses)
                  .slice(0, 10)
                  .map(([category, data]) => (
                    <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{category}</div>
                        <div className="text-sm text-gray-500">
                          {data.transactionCount} транзакці{data.transactionCount === 1 ? 'я' : data.transactionCount < 5 ? 'ї' : 'й'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-red-600">
                          -{formatAmount(data.expenses)}
                        </div>
                        {data.income > 0 && (
                          <div className="text-sm text-green-600">
                            +{formatAmount(data.income)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <div className="text-center">
                  <div className="text-3xl mb-2">📝</div>
                  <p>Немає категорій для відображення</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historical Summary with Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📅 Історія по місяцях
        </h3>
        
        {/* History Tabs */}
        <div className="mb-4">
          <TabSwitcher
            activeTab={historyView}
            onTabChange={setHistoryView}
            tabs={[
              { id: "overview", label: "Огляд" },
              { id: "detailed", label: "Деталізовано" },
              { id: "comparison", label: "Порівняння" },
            ]}
          />
        </div>

        {/* Overview Tab */}
        {historyView === "overview" && (
          <div className="space-y-3">
            {monthlyData.slice(0, 12).map((month) => (
              <div
                key={month.monthKey}
                className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{month.monthName}</div>
                  <div className="text-sm text-gray-500">
                    {month.transactionCount} транзакцій • {Object.keys(month.categoryBreakdown).length} категорій
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-4">
                    {month.totalIncome > 0 && (
                      <div className="text-sm">
                        <span className="text-green-600 font-medium">+{formatAmount(month.totalIncome)}</span>
                        <div className="text-xs text-gray-500">доходи</div>
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="text-red-600 font-semibold">-{formatAmount(month.totalExpenses)}</span>
                      <div className="text-xs text-gray-500">витрати</div>
                    </div>
                    <div className="text-sm">
                      <span className={`font-semibold ${month.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {month.netAmount >= 0 ? '+' : ''}{formatAmount(month.netAmount)}
                      </span>
                      <div className="text-xs text-gray-500">баланс</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detailed Tab */}
        {historyView === "detailed" && (
          <div className="space-y-4">
            {monthlyData.slice(0, 6).map((month) => (
              <div key={month.monthKey} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{month.monthName}</h4>
                  <div className="text-sm text-gray-500">
                    {month.transactionCount} транзакцій
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-sm text-green-600">Доходи</div>
                    <div className="font-semibold text-green-800">{formatAmount(month.totalIncome)}</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-sm text-red-600">Витрати</div>
                    <div className="font-semibold text-red-800">{formatAmount(month.totalExpenses)}</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Баланс</div>
                    <div className={`font-semibold ${month.netAmount >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                      {formatAmount(month.netAmount)}
                    </div>
                  </div>
                </div>

                {/* Top Categories for this month */}
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Топ категорії:</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(month.categoryBreakdown)
                      .sort(([, a], [, b]) => b.expenses - a.expenses)
                      .slice(0, 4)
                      .map(([category, data]) => (
                        <div key={category} className="flex justify-between text-sm bg-gray-50 rounded px-3 py-2">
                          <span className="truncate text-gray-700">{category}</span>
                          <span className="text-red-600 font-medium">-{formatAmount(data.expenses)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Comparison Tab */}
        {historyView === "comparison" && (
          <div className="space-y-3">
            {monthlyData.map((month, index) => {
              const previousMonth = monthlyData[index + 1]; // Next in array is previous chronologically
              
              // Calculate changes compared to previous month
              const expenseChange = previousMonth && previousMonth.totalExpenses > 0 
                ? ((month.totalExpenses - previousMonth.totalExpenses) / previousMonth.totalExpenses) * 100
                : null;
              const incomeChange = previousMonth && previousMonth.totalIncome > 0
                ? ((month.totalIncome - previousMonth.totalIncome) / previousMonth.totalIncome) * 100
                : null;

              return (
                <div key={month.monthKey} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {month.monthName}
                      {index === 0 && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">поточний</span>}
                    </div>
                    <div className="text-sm text-gray-500">
                      {previousMonth ? `порівняно з ${previousMonth.monthName}` : 'перший місяць у даних'}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    {incomeChange !== null && Math.abs(incomeChange) > 0.1 && (
                      <div className="text-center">
                        <div className={`font-medium ${incomeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {incomeChange >= 0 ? '+' : ''}{incomeChange.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500">доходи</div>
                      </div>
                    )}
                    {expenseChange !== null && Math.abs(expenseChange) > 0.1 && (
                      <div className="text-center">
                        <div className={`font-medium ${expenseChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {expenseChange >= 0 ? '+' : ''}{expenseChange.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500">витрати</div>
                      </div>
                    )}
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{formatAmount(month.totalExpenses)}</div>
                      <div className="text-xs text-gray-500">{month.transactionCount} транзакцій</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyBreakdown;