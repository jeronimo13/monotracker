import { useState, useCallback } from "react";

export interface CategoryFacetState {
  selectedCategories: string[];
  toggleCategory: (category: string) => void;
  setOnlyCategory: (category: string) => void;
  clearAllCategories: () => void;
  hasActiveFilters: boolean;
}

export const useCategoryFacets = (initialCategories: string[] = []): CategoryFacetState => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories);

  const toggleCategory = useCallback((category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        // Remove category if already selected
        return prev.filter(c => c !== category);
      } else {
        // Add category if not selected
        return [...prev, category];
      }
    });
  }, []);

  const setOnlyCategory = useCallback((category: string) => {
    setSelectedCategories([category]);
  }, []);

  const clearAllCategories = useCallback(() => {
    setSelectedCategories([]);
  }, []);

  const hasActiveFilters = selectedCategories.length > 0;

  return {
    selectedCategories,
    toggleCategory,
    setOnlyCategory,
    clearAllCategories,
    hasActiveFilters,
  };
};