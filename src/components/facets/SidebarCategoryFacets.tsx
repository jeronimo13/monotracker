import React, { useMemo } from "react";
import type { Transaction } from "../../types";
import FacetFilter, { type FacetData } from "./FacetFilter";

interface SidebarCategoryFacetsProps {
  transactions: Transaction[];
  selectedCategories: string[];
  onCategoryToggle: (category: string) => void;
  onCategoryOnly: (category: string) => void;
  onClearAll: () => void;
  maxItems?: number;
}

const SidebarCategoryFacets: React.FC<SidebarCategoryFacetsProps> = ({
  transactions,
  selectedCategories,
  onCategoryToggle,
  onCategoryOnly,
  onClearAll,
  maxItems = 15,
}) => {
  const facetData = useMemo(() => {
    // Aggregate categories from transactions
    const categoryTotals = new Map<string, { count: number; amount: number }>();
    
    transactions.forEach(transaction => {
      const category = transaction.category || 'Без категорії';
      if (!categoryTotals.has(category)) {
        categoryTotals.set(category, { count: 0, amount: 0 });
      }
      const existing = categoryTotals.get(category)!;
      existing.count += 1;
      // Only count expenses for the sidebar (negative amounts)
      if (transaction.amount < 0) {
        existing.amount += Math.abs(transaction.amount);
      }
    });

    // Calculate total expenses for percentages
    const totalExpenses = Array.from(categoryTotals.values()).reduce(
      (sum, data) => sum + data.amount,
      0
    );

    // Convert to FacetData array and sort by amount
    const facets: FacetData[] = Array.from(categoryTotals.entries())
      .filter(([, data]) => data.amount > 0) // Only show categories with expenses
      .map(([category, data]) => ({
        label: category,
        value: category,
        count: data.count,
        amount: data.amount,
        percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, maxItems);

    return facets;
  }, [transactions, maxItems]);

  if (facetData.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        <div className="text-center">
          <div className="text-3xl mb-2">📊</div>
          <p className="text-sm">Немає категорій</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Розподіл за категоріями
        </h3>
        {selectedCategories.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-red-600 hover:text-red-800 underline"
            title="Очистити всі фільтри категорій"
          >
            Очистити
          </button>
        )}
      </div>

      {/* Selected Categories Summary */}
      {selectedCategories.length > 0 && (
        <div className="mb-3 p-2 bg-purple-50 rounded-lg border border-purple-200">
          <div className="text-xs text-purple-800 font-medium mb-1">
            Активні фільтри:
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedCategories.map((category) => (
              <span
                key={category}
                className="inline-flex items-center px-1.5 py-0.5 text-xs bg-purple-100 text-purple-800 rounded"
              >
                <span className="truncate max-w-20" title={category}>
                  {category}
                </span>
                <button
                  onClick={() => onCategoryToggle(category)}
                  className="ml-1 hover:text-purple-600 font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Facet Filters */}
      <div className="space-y-0.5 max-h-96 overflow-y-auto">
        {facetData.map((facet) => (
          <FacetFilter
            key={facet.value}
            facet={facet}
            isSelected={selectedCategories.includes(facet.value)}
            onToggle={onCategoryToggle}
            onOnly={onCategoryOnly}
            className="text-sm"
          />
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-2 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          {facetData.length} категорій
          {selectedCategories.length > 0 && (
            <span> • {selectedCategories.length} обрано</span>
          )}
        </div>
      </div>
    </>
  );
};

export default SidebarCategoryFacets;