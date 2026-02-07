import React from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Pie } from "react-chartjs-2";
import type { CategoryData } from "../../utils/monthlyAnalytics";
import { formatAmount } from "../../utils/formatters";

ChartJS.register(ArcElement, Tooltip, Legend);

interface CategoryPieChartProps {
  categoryBreakdown: { [category: string]: CategoryData };
  title?: string;
}

const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ 
  categoryBreakdown, 
  title = "Розбивка витрат по категоріях"
}) => {
  // Get top categories by expenses
  const sortedCategories = Object.entries(categoryBreakdown)
    .sort(([, a], [, b]) => b.expenses - a.expenses)
    .slice(0, 8); // Show top 8 categories

  // Generate colors for categories
  const colors = [
    "rgba(239, 68, 68, 0.8)",   // red
    "rgba(34, 197, 94, 0.8)",   // green
    "rgba(59, 130, 246, 0.8)",  // blue
    "rgba(245, 158, 11, 0.8)",  // amber
    "rgba(168, 85, 247, 0.8)",  // purple
    "rgba(236, 72, 153, 0.8)",  // pink
    "rgba(20, 184, 166, 0.8)",  // teal
    "rgba(251, 146, 60, 0.8)",  // orange
  ];

  const borderColors = [
    "rgba(239, 68, 68, 1)",
    "rgba(34, 197, 94, 1)",
    "rgba(59, 130, 246, 1)",
    "rgba(245, 158, 11, 1)",
    "rgba(168, 85, 247, 1)",
    "rgba(236, 72, 153, 1)",
    "rgba(20, 184, 166, 1)",
    "rgba(251, 146, 60, 1)",
  ];

  const data = {
    labels: sortedCategories.map(([category]) => category),
    datasets: [
      {
        data: sortedCategories.map(([, data]) => data.expenses / 100),
        backgroundColor: colors,
        borderColor: borderColors,
        borderWidth: 2,
        hoverOffset: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          generateLabels: function(chart: any) {
            const original = ChartJS.defaults.plugins.legend.labels.generateLabels;
            const labels = original.call(this, chart);
            
            labels.forEach((label: any, index: number) => {
              const categoryData = sortedCategories[index];
              if (categoryData) {
                const [categoryName, data] = categoryData;
                const value = data?.expenses || 0;
                label.text = `${categoryName} (${formatAmount(value)})`;
              }
            });
            
            return labels;
          },
        },
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: "bold" as const,
        },
        padding: 20,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "white",
        bodyColor: "white",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            const category = context.label;
            const value = context.parsed;
            const categoryData = categoryBreakdown[category];
            const totalExpenses = sortedCategories.reduce((sum, [, data]) => sum + (data.expenses / 100), 0);
            const percentage = totalExpenses > 0 ? ((value / totalExpenses) * 100).toFixed(1) : "0";
            
            if (!category || category === "undefined") {
              return [`Невідома категорія: ${formatAmount(value * 100)}`];
            }
            
            return [
              `${category}: ${formatAmount(value * 100)} (${percentage}%)`,
              `Транзакцій: ${categoryData?.transactionCount || 0}`,
            ];
          },
        },
      },
    },
  };

  if (sortedCategories.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p>Немає даних для відображення</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <Pie data={data} options={options} />
    </div>
  );
};

export default CategoryPieChart;