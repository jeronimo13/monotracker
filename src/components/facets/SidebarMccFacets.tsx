import React, { useMemo } from "react";
import type { Transaction } from "../../types";
import FacetFilter, { type FacetData } from "./FacetFilter";

interface SidebarMccFacetsProps {
  transactions: Transaction[];
  selectedMccCodes: string[];
  onMccToggle: (mccCode: string) => void;
  onMccOnly: (mccCode: string) => void;
  onClearAll: () => void;
  maxItems?: number;
  mccData?: { [key: string]: string };
}

const SidebarMccFacets: React.FC<SidebarMccFacetsProps> = ({
  transactions,
  selectedMccCodes,
  onMccToggle,
  onMccOnly,
  onClearAll,
  maxItems = 12,
  mccData = {},
}) => {
  const facetData = useMemo(() => {
    // Aggregate MCCs from transactions
    const mccTotals = new Map<string, { count: number; amount: number }>();
    
    transactions.forEach(transaction => {
      const mccCode = transaction.mcc.toString();
      if (!mccTotals.has(mccCode)) {
        mccTotals.set(mccCode, { count: 0, amount: 0 });
      }
      const existing = mccTotals.get(mccCode)!;
      existing.count += 1;
      // Only count expenses for the sidebar (negative amounts)
      if (transaction.amount < 0) {
        existing.amount += Math.abs(transaction.amount);
      }
    });

    // Convert to FacetData array and sort by amount
    const facets: FacetData[] = Array.from(mccTotals.entries())
      .filter(([, data]) => data.amount > 0) // Only show MCCs with expenses
      .map(([mccCode, data]) => {
        const mccDescription = mccData[mccCode] || "";
        const displayLabel = mccDescription 
          ? `${mccCode} - ${mccDescription}`
          : mccCode;
        
        return {
          label: displayLabel,
          value: mccCode,
          count: data.count,
          amount: data.amount,
          percentage: 0, // Not used in compact layout
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, maxItems);

    return facets;
  }, [transactions, maxItems, mccData]);

  if (facetData.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        <div className="text-center">
          <div className="text-3xl mb-2">🏪</div>
          <p className="text-sm">Немає MCC кодів</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Розподіл за MCC
        </h3>
        {selectedMccCodes.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-red-600 hover:text-red-800 underline"
            title="Очистити всі MCC фільтри"
          >
            Очистити
          </button>
        )}
      </div>

      {/* Selected MCCs Summary */}
      {selectedMccCodes.length > 0 && (
        <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-xs text-blue-800 font-medium mb-1">
            Активні MCC фільтри:
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedMccCodes.map((mccCode) => (
              <span
                key={mccCode}
                className="inline-flex items-center px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded"
              >
                <span className="truncate max-w-20" title={mccCode}>
                  {mccCode}
                </span>
                <button
                  onClick={() => onMccToggle(mccCode)}
                  className="ml-1 hover:text-blue-600 font-bold"
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
            isSelected={selectedMccCodes.includes(facet.value)}
            onToggle={onMccToggle}
            onOnly={onMccOnly}
            className="text-sm"
          />
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-2 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          {facetData.length} MCC кодів
          {selectedMccCodes.length > 0 && (
            <span> • {selectedMccCodes.length} обрано</span>
          )}
        </div>
      </div>
    </>
  );
};

export default SidebarMccFacets;