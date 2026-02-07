import { formatAmount } from "../utils/formatters";

interface CategoryCardProps {
  category: string;
  count: number;
  totalAmount: number;
  onClick: () => void;
}

const CategoryCard = ({
  category,
  count,
  totalAmount,
  onClick,
}: CategoryCardProps) => {
  const isPositive = totalAmount > 0;
  const amountColor = isPositive ? "text-green-600" : "text-red-600";
  const amountPrefix = isPositive ? "+" : "";

  return (
    <div
      className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors cursor-pointer text-sm"
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-900 min-w-0 truncate">
          {category}
        </span>
        <span className="text-gray-500 text-xs">({count})</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className={`font-semibold whitespace-nowrap ${amountColor}`}>
          {amountPrefix}
          {formatAmount(totalAmount)}
        </span>
      </div>
    </div>
  );
};

export default CategoryCard;
