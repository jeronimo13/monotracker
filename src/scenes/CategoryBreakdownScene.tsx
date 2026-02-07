import { useState } from "react";
import CategoryCard from "../components/CategoryCard";

interface CategoryStats {
  count: number;
  totalAmount: number;
  income: number;
  expenses: number;
}

interface CategoryBreakdownSceneProps {
  sortedCategories: [string, CategoryStats][];
  onCategoryClick: (category: string) => void;
}

const CategoryBreakdownScene = ({
  sortedCategories,
  onCategoryClick,
}: CategoryBreakdownSceneProps) => {
  const [showCategoryBreakdown, setShowCategoryBreakdown] = useState(false);

  if (sortedCategories.length === 0) {
    return null;
  }

  const toggleBreakdown = () => {
    setShowCategoryBreakdown(!showCategoryBreakdown);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Розподіл за категоріями
        </h3>
        <button
          onClick={toggleBreakdown}
          className="text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
        >
          {showCategoryBreakdown ? (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          )}
        </button>
      </div>
      {showCategoryBreakdown && (
        <div className="flex flex-col gap-1">
          {sortedCategories.map(([category, stats]) => (
            <CategoryCard
              key={category}
              category={category}
              count={stats.count}
              totalAmount={stats.totalAmount}
              onClick={() => onCategoryClick(category)}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default CategoryBreakdownScene;
