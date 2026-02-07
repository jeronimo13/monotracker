import { useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { parseFiltersFromUrl, filtersToUrlParams, getCurrentDateRangeUrlString, urlStringToDateRange } from '../utils/urlFilters';
import { parseNaturalDateRange } from '../utils/dateRangeParser';
import type { Filters } from '../types';

interface UseUrlFiltersProps {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  setDateRange: (start?: number, end?: number) => void;
  inputValue: string;
  setInputValue: (value: string) => void;
}

interface UseUrlFiltersReturn {
  updateUrlFromFilters: () => void;
  loadFiltersFromUrl: () => void;
}


export const useUrlFilters = ({
  filters,
  setFilters,
  setDateRange,
  inputValue,
  setInputValue
}: UseUrlFiltersProps): UseUrlFiltersReturn => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isUpdatingUrl = useRef(false);
  const hasInitialized = useRef(false);
  const lastUrlString = useRef(searchParams.toString());

  // Update URL when filters change
  const updateUrlFromFilters = useCallback(() => {
    // Don't update URL if haven't initialized yet
    if (!hasInitialized.current) {
      return;
    }
    
    const dateRangeString = getCurrentDateRangeUrlString(inputValue);
    const params = filtersToUrlParams(filters, dateRangeString);
    const newUrlString = params.toString();
    
    // Only update if there are actual filter changes
    if (newUrlString !== searchParams.toString()) {
      isUpdatingUrl.current = true;
      setSearchParams(params, { replace: true });
      lastUrlString.current = newUrlString;
      console.log('URL updated with filters:', newUrlString);
      
      // Reset flag after URL update
      setTimeout(() => {
        isUpdatingUrl.current = false;
      }, 50);
    }
  }, [filters, inputValue, searchParams, setSearchParams]);

  // Load filters from URL on mount and when URL changes
  const loadFiltersFromUrl = useCallback(() => {
    const urlFilters = parseFiltersFromUrl(searchParams);
    console.log('Loading filters from URL:', urlFilters);
    
    // Update regular filters
    const newFilters: Filters = {
      description: urlFilters.description || '',
      mcc: urlFilters.mcc || '',
      mccCodes: urlFilters.mccCodes || [],
      category: urlFilters.category || '',
      categories: urlFilters.categories || [],
      search: urlFilters.search || '',
    };
    
    setFilters(newFilters);
    
    // Handle date range filter
    if (urlFilters.dateRange) {
      const dateRangeStr = urlFilters.dateRange;
      
      // First try to parse as absolute date range (YYYY-MM-DD or YYYY-MM-DDtoYYYY-MM-DD)
      const absoluteRange = urlStringToDateRange(dateRangeStr);
      if (absoluteRange) {
        setDateRange(absoluteRange.start, absoluteRange.end);
        // Format for display
        const startDate = new Date(absoluteRange.start * 1000).toISOString().split('T')[0];
        const endDate = new Date(absoluteRange.end * 1000).toISOString().split('T')[0];
        if (startDate === endDate) {
          setInputValue(startDate);
        } else {
          setInputValue(`${startDate} до ${endDate}`);
        }
        return;
      }
      
      // Try to parse as relative pattern (1d, 7d, etc.)
      if (dateRangeStr.match(/^\d+[dwmy]$/)) {
        const parsed = parseNaturalDateRange(dateRangeStr);
        if (parsed) {
          setDateRange(parsed.start, parsed.end);
          setInputValue(parsed.display);
          return;
        }
      }
    }
    
    // If no date range in URL or parsing failed, clear date range
    if (!urlFilters.dateRange) {
      setDateRange();
      setInputValue('Весь час');
    }
    
  }, [searchParams, setFilters, setDateRange, setInputValue]);

  // Load filters from URL only when URL actually changes externally (not from our updates)
  useEffect(() => {
    const currentUrlString = searchParams.toString();
    
    // Only load if URL actually changed and we're not the ones updating it
    if (currentUrlString !== lastUrlString.current && !isUpdatingUrl.current) {
      console.log('URL changed externally, loading filters');
      loadFiltersFromUrl();
      lastUrlString.current = currentUrlString;
    }
  }, [searchParams, loadFiltersFromUrl]);
  
  // Initialize by loading from URL on mount
  useEffect(() => {
    if (!hasInitialized.current) {
      console.log('Initial load from URL');
      loadFiltersFromUrl();
      lastUrlString.current = searchParams.toString();
      hasInitialized.current = true;
    }
  }, [loadFiltersFromUrl, searchParams]);

  // Update URL when filters or date range change (but not on initial load)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateUrlFromFilters();
    }, 300); // Debounce URL updates
    
    return () => clearTimeout(timeoutId);
  }, [updateUrlFromFilters]);

  return {
    updateUrlFromFilters,
    loadFiltersFromUrl,
  };
};
