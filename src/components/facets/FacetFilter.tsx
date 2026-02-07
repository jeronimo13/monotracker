import React, { useState } from "react";
import { formatCompactAmount } from "../../utils/formatters";

export interface FacetData {
  label: string;
  value: string;
  count: number;
  amount: number;
  percentage: number;
}

interface FacetFilterProps {
  facet: FacetData;
  isSelected: boolean;
  onToggle: (value: string) => void;
  onOnly: (value: string) => void;
  className?: string;
}

const FacetFilter: React.FC<FacetFilterProps> = ({
  facet,
  isSelected,
  onToggle,
  onOnly,
  className = "",
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    onToggle(facet.value);
  };

  const handleOnlyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOnly(facet.value);
  };

  return (
    <div
      className={`relative group cursor-pointer transition-all duration-200 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div
        className={`flex items-center justify-between p-2 rounded-md border transition-all duration-200 ${
          isSelected
            ? "bg-purple-50 border-purple-200 shadow-sm"
            : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
        }`}
      >
        {/* Selection Indicator & Content */}
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <div
            className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
              isSelected
                ? "bg-purple-600 border-purple-600"
                : "border-gray-300 hover:border-purple-400"
            }`}
          >
            {isSelected && (
              <svg
                className="w-2 h-2 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>

          <div className="flex-1 min-w-0 flex items-center">
            <span
              className={`font-medium text-sm truncate mr-2 ${
                isSelected ? "text-purple-900" : "text-gray-900"
              }`}
              title={facet.label}
            >
              {facet.label}
            </span>
            
            {/* Hover "тільки" button */}
            {isHovered && (
              <button
                onClick={handleOnlyClick}
                className="px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm mr-2"
                title="Показати тільки цю категорію"
              >
                тільки
              </button>
            )}
            
            {/* Count and Amount grouped on the right */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-gray-500">
                {facet.count}
              </span>
              <span className={`text-sm font-medium ${
                isSelected ? "text-purple-900" : "text-gray-900"
              }`}>
                {formatCompactAmount(facet.amount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacetFilter;