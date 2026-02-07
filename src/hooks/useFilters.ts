import { useState, useMemo } from "react";
import type { Transaction, Filters } from "../types";
import { useDateRange } from "./useDateRange";
import { useUrlFilters } from "./useUrlFilters";

interface UseFiltersReturn {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  addFilter: (type: keyof Filters, value: string) => void;
  removeFilter: (type: keyof Filters) => void;
  clearAllFilters: () => void;
  toggleCategoryFacet: (category: string) => void;
  setCategoryFacetOnly: (category: string) => void;
  clearCategoryFacets: () => void;
  toggleMccFacet: (mccCode: string) => void;
  setMccFacetOnly: (mccCode: string) => void;
  clearMccFacets: () => void;
  filteredTransactions: Transaction[];
}

const initialFilters: Filters = {
  description: "",
  mcc: "",
  mccCodes: [],
  category: "",
  categories: [],
  search: "",
};

export const useFilters = (
  transactions: Transaction[],
  showUncategorized: boolean = false,
  showWithdrawalsOnly: boolean = false
): UseFiltersReturn => {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const { dateRange, inputValue, setDateRange, setInputValue } = useDateRange();
  
  // URL synchronization
  useUrlFilters({
    filters,
    setFilters,
    setDateRange,
    inputValue,
    setInputValue
  });

  const addFilter = (type: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [type]: value }));
  };

  const removeFilter = (type: keyof Filters) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      
      switch (type) {
        case 'description':
        case 'mcc':
        case 'category':
        case 'search':
          newFilters[type] = '';
          break;
        case 'mccCodes':
        case 'categories':
          newFilters[type] = [];
          break;
        default:
          console.warn(`Unknown filter type: ${type}`);
      }
      
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setFilters(initialFilters);
  };

  // Category facet management
  const toggleCategoryFacet = (category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const setCategoryFacetOnly = (category: string) => {
    setFilters(prev => ({ ...prev, categories: [category] }));
  };

  const clearCategoryFacets = () => {
    setFilters(prev => ({ ...prev, categories: [] }));
  };

  // MCC facet management
  const toggleMccFacet = (mccCode: string) => {
    setFilters(prev => ({
      ...prev,
      mccCodes: prev.mccCodes.includes(mccCode)
        ? prev.mccCodes.filter(c => c !== mccCode)
        : [...prev.mccCodes, mccCode]
    }));
  };

  const setMccFacetOnly = (mccCode: string) => {
    setFilters(prev => ({ ...prev, mccCodes: [mccCode] }));
  };

  const clearMccFacets = () => {
    setFilters(prev => ({ ...prev, mccCodes: [] }));
  };


  // Filter transactions (wrapped in useMemo to react to dateRange changes)
  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const descriptionMatch =
        !filters.description ||
        transaction.description
          .toLowerCase()
          .includes(filters.description.toLowerCase());

      const mccMatch =
        !filters.mcc || transaction.mcc.toString().includes(filters.mcc);

      const categoryMatch =
        !filters.category ||
        (transaction.category &&
          transaction.category
            .toLowerCase()
            .includes(filters.category.toLowerCase()));
      
      // Multiple category facet filtering
      const categoriesFacetMatch = 
        filters.categories.length === 0 || 
        filters.categories.includes(transaction.category || 'Без категорії');
      
      // Multiple MCC facet filtering
      const mccCodesFacetMatch = 
        filters.mccCodes.length === 0 || 
        filters.mccCodes.includes(transaction.mcc.toString());

      // Search functionality - search in description, comment, and category
      const searchMatch =
        !filters.search ||
        transaction.description
          .toLowerCase()
          .includes(filters.search.toLowerCase()) ||
        (transaction.comment &&
          transaction.comment
            .toLowerCase()
            .includes(filters.search.toLowerCase())) ||
        (transaction.category &&
          transaction.category
            .toLowerCase()
            .includes(filters.search.toLowerCase()));

      // Date range filtering (from useDateRange hook)
      const dateRangeMatch = 
        !dateRange ||
        (!dateRange.start || transaction.time >= dateRange.start) &&
        (!dateRange.end || transaction.time <= dateRange.end);
      

      // Apply uncategorized toggle
      const uncategorizedMatch = !showUncategorized || !transaction.category;

      // Apply withdrawals-only toggle
      const withdrawalsMatch = !showWithdrawalsOnly || transaction.amount < 0;

      return (
        descriptionMatch &&
        mccMatch &&
        mccCodesFacetMatch &&
        categoryMatch &&
        categoriesFacetMatch &&
        searchMatch &&
        dateRangeMatch &&
        uncategorizedMatch &&
        withdrawalsMatch
      );
    });
  }, [transactions, filters, dateRange, showUncategorized, showWithdrawalsOnly]);

  return {
    filters,
    setFilters,
    addFilter,
    removeFilter,
    clearAllFilters,
    toggleCategoryFacet,
    setCategoryFacetOnly,
    clearCategoryFacets,
    toggleMccFacet,
    setMccFacetOnly,
    clearMccFacets,
    filteredTransactions,
  };
};