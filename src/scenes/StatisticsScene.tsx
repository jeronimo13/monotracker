import type { Transaction } from "../types";
import { formatAmount } from "../utils/formatters";

interface StatisticsSceneProps {
  filteredTransactions: Transaction[];
}

const StatisticsScene = ({ filteredTransactions }: StatisticsSceneProps) => {
  const income = filteredTransactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = Math.abs(
    filteredTransactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0)
  );

  return (
    <div className="flex items-center gap-6 text-sm">
      <div className="flex items-center gap-1.5">
        <span className="text-green-600 font-medium">Прибуток:</span>
        <span className="text-green-900 font-bold">{formatAmount(income)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-red-600 font-medium">Витрати:</span>
        <span className="text-red-900 font-bold">{formatAmount(expenses)}</span>
      </div>
    </div>
  );
};

export default StatisticsScene;
