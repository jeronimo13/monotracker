import type { Transaction } from "../types";
import StatCard from "../components/StatCard";

interface StatisticsSceneProps {
  filteredTransactions: Transaction[];
}

const StatisticsScene = ({ filteredTransactions }: StatisticsSceneProps) => {
  // Calculate all the values

  const income = filteredTransactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = Math.abs(
    filteredTransactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0)
  );

  // Business logic for header text
  const getHeaderText = (type: "income" | "expenses") => {
    switch (type) {
      case "income":
        return "Прибуток";
      case "expenses":
        return "Витрати";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <StatCard
        color="green"
        header={getHeaderText("income")}
        amount={income}
      />
      <StatCard
        color="red"
        header={getHeaderText("expenses")}
        amount={expenses}
      />
    </div>
  );
};

export default StatisticsScene;
