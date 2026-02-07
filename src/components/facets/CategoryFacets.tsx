import React, { useMemo } from "react";
import type { MonthlyData } from "../../utils/monthlyAnalytics";
import FacetFilter, { type FacetData } from "./FacetFilter";

interface CategoryFacetsProps {
  monthlyData: MonthlyData[];
  selectedCategories: string[];
  onCategoryToggle: (category: string) => void;
  onCategoryOnly: (category: string) => void;
  onClearAll: () => void;
  maxItems?: number;
  title?: string;
}

const CategoryFacets: React.FC<CategoryFacetsProps> = ({
  monthlyData,
  selectedCategories,
  onCategoryToggle,
  onCategoryOnly,
  onClearAll,
  maxItems = 10,
  title = "Розподіл за категоріями",
}) => {
  const facetData = useMemo(() => {
    // Aggregate all categories across all months
    const categoryTotals = new Map<string, { count: number; amount: number }>();
    
    monthlyData.forEach(month => {
      Object.entries(month.categoryBreakdown).forEach(([category, data]) => {
        if (!categoryTotals.has(category)) {
          categoryTotals.set(category, { count: 0, amount: 0 });
        }
        const existing = categoryTotals.get(category)!;
        existing.count += data.transactionCount;
        existing.amount += data.expenses;
      });
    });

    // Calculate total for percentages
    const totalAmount = Array.from(categoryTotals.values()).reduce(
      (sum, data) => sum + data.amount,
      0
    );

    // Convert to FacetData array and sort by amount
    const facets: FacetData[] = Array.from(categoryTotals.entries())
      .map(([category, data]) => ({
        label: category,
        value: category,
        count: data.count,
        amount: data.amount,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, maxItems);

    return facets;
  }, [monthlyData, maxItems]);

  if (facetData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-32 text-gray-500">
          <div className="text-center">
            <div className="text-3xl mb-2">📊</div>
            <p>Немає категорій для відображення</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {selectedCategories.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {selectedCategories.length} обрано
            </span>
            <button
              onClick={onClearAll}
              className="text-sm text-red-600 hover:text-red-800 underline"
            >
              Очистити все
            </button>
          </div>
        )}
      </div>

      {/* Selected Categories Summary */}
      {selectedCategories.length > 0 && (
        <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div className="text-sm text-purple-800 font-medium mb-2">
            Активні фільтри:
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map((category) => (
              <span
                key={category}
                className="inline-flex items-center px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full"
              >
                {category}
                <button
                  onClick={() => onCategoryToggle(category)}
                  className="ml-1 hover:text-purple-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Facet Filters */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {facetData.map((facet) => (
          <FacetFilter
            key={facet.value}
            facet={facet}
            isSelected={selectedCategories.includes(facet.value)}
            onToggle={onCategoryToggle}
            onOnly={onCategoryOnly}
          />
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          Показано топ {facetData.length} категорій
          {selectedCategories.length > 0 && (
            <span> • {selectedCategories.length} активних фільтрів</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryFacets;