import type { Filters } from "../types";

export interface UrlFilters {
  description?: string;
  mcc?: string;
  mccCodes?: string[];
  category?: string;
  categories?: string[];
  search?: string;
  dateRange?: string; // encoded as "1d", "7d", "2024-01-01to2024-01-31", etc.
}

/**
 * Parse URL search parameters into filter object
 */
export const parseFiltersFromUrl = (searchParams: URLSearchParams): UrlFilters => {
  const filters: UrlFilters = {};
  
  // Simple string filters
  const description = searchParams.get('description');
  if (description) filters.description = description;
  
  const mcc = searchParams.get('mcc');
  if (mcc) filters.mcc = mcc;
  
  const category = searchParams.get('category');
  if (category) filters.category = category;
  
  const search = searchParams.get('search');
  if (search) filters.search = search;
  
  // Array filters (comma-separated)
  const mccCodes = searchParams.get('mccCodes');
  if (mccCodes) {
    filters.mccCodes = mccCodes.split(',').filter(code => code.trim() !== '');
  }
  
  const categories = searchParams.get('categories');
  if (categories) {
    filters.categories = categories.split(',').filter(cat => cat.trim() !== '');
  }
  
  // Date range filter
  const dateRange = searchParams.get('dateRange');
  if (dateRange) {
    filters.dateRange = dateRange;
  }
  
  return filters;
};

/**
 * Convert filter object to URL search parameters
 */
export const filtersToUrlParams = (filters: Filters, dateRangeString?: string): URLSearchParams => {
  const params = new URLSearchParams();
  
  // Simple string filters
  if (filters.description) params.set('description', filters.description);
  if (filters.mcc) params.set('mcc', filters.mcc);
  if (filters.category) params.set('category', filters.category);
  if (filters.search) params.set('search', filters.search);
  
  // Array filters (comma-separated)
  if (filters.mccCodes && filters.mccCodes.length > 0) {
    params.set('mccCodes', filters.mccCodes.join(','));
  }
  if (filters.categories && filters.categories.length > 0) {
    params.set('categories', filters.categories.join(','));
  }
  
  // Date range filter (passed separately since it's managed by DateRangeContext)
  if (dateRangeString) {
    params.set('dateRange', dateRangeString);
  }
  
  return params;
};

/**
 * Convert date range object to URL-friendly string
 */
export const dateRangeToUrlString = (dateRange: { start?: number; end?: number } | undefined): string | undefined => {
  if (!dateRange || !dateRange.start || !dateRange.end) {
    return undefined;
  }
  
  // Convert timestamps to dates
  const startDate = new Date(dateRange.start * 1000);
  const endDate = new Date(dateRange.end * 1000);
  
  // Format as YYYY-MM-DD
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  
  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);
  
  // If it's the same day, just return the date
  if (startStr === endStr) {
    return startStr;
  }
  
  // Return as range
  return `${startStr}to${endStr}`;
};

/**
 * Convert URL string back to date range object
 */
export const urlStringToDateRange = (urlString: string): { start: number; end: number } | undefined => {
  if (!urlString) return undefined;
  
  try {
    // Handle single date (YYYY-MM-DD)
    if (urlString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const date = new Date(urlString);
      const start = Math.floor(date.getTime() / 1000);
      const end = Math.floor(new Date(urlString + 'T23:59:59').getTime() / 1000);
      return { start, end };
    }
    
    // Handle date range (YYYY-MM-DDtoYYYY-MM-DD)
    const rangeMatch = urlString.match(/^(\d{4}-\d{2}-\d{2})to(\d{4}-\d{2}-\d{2})$/);
    if (rangeMatch) {
      const [, startDateStr, endDateStr] = rangeMatch;
      const start = Math.floor(new Date(startDateStr).getTime() / 1000);
      const end = Math.floor(new Date(endDateStr + 'T23:59:59').getTime() / 1000);
      return { start, end };
    }
    
    // Handle relative patterns (1d, 7d, 2w, etc.) - these need to be parsed by the existing parser
    // We'll handle this in the context where we have access to transaction bounds
    return undefined;
  } catch (error) {
    console.error('Error parsing date range from URL:', error);
    return undefined;
  }
};

/**
 * Get current date range string for URL (for relative patterns like "1d", "7d")
 * This is used to represent the current selection in the URL
 */
export const getCurrentDateRangeUrlString = (inputValue: string): string | undefined => {
  console.log('getCurrentDateRangeUrlString called with:', inputValue);
  
  // If it's a relative pattern, convert to shorthand for URL
  // convert to shorthand for URL
  const relativePatterns: { [key: string]: string } = {
    'Останній день': '1d',
    'Останні 3 дні': '3d',
    'Останній тиждень': '1w',
    'Останні 2 тижні': '2w',
    'Останній місяць': '1m',
    'Останні 3 місяці': '3m',
    'Останні 6 місяців': '6m',
    'Останній рік': '1y',

    // Keep EN aliases for backward compatibility
    'Last 1 day': '1d',
    'Last day': '1d',
    'Last 3 days': '3d', 
    'Last 1 week': '1w',
    'Last week': '1w',
    'Last 2 weeks': '2w',
    'Last 1 month': '1m',
    'Last month': '1m',
    'Last 3 months': '3m',
    'Last 6 months': '6m',
    'Last 1 year': '1y',
    'Last year': '1y',
    
    // Also handle the patterns that come from the presets
    'One day': '1d',
    'Three days': '3d',
    'One week': '1w', 
    'Two weeks': '2w',
    'One month': '1m',
    'Three months': '3m',
    'Six months': '6m',
    'One year': '1y',
  };
  
  // Check if current inputValue matches any known pattern
  const urlString = relativePatterns[inputValue];
  if (urlString) {
    console.log('Found pattern match:', inputValue, '→', urlString);
    return urlString;
  }
  
  // If it's already a short pattern (1d, 7d, etc.), use it directly
  if (inputValue.match(/^\d+[dwmy]$/)) {
    console.log('Already short pattern:', inputValue);
    return inputValue;
  }
  
  // Handle dynamic "Last/Останні X ..." patterns
  const dynamicMatch = inputValue.match(
    /^(?:Last|Останні)\s+(\d+)\s+(days?|weeks?|months?|years?|день|дні|днів|тиждень|тижні|тижнів|місяць|місяці|місяців|рік|роки|років)$/i
  );
  if (dynamicMatch) {
    const [, amount, unit] = dynamicMatch;
    const unitMap: { [key: string]: string } = {
      'day': 'd', 'days': 'd',
      'week': 'w', 'weeks': 'w', 
      'month': 'm', 'months': 'm',
      'year': 'y', 'years': 'y',
      'день': 'd', 'дні': 'd', 'днів': 'd',
      'тиждень': 'w', 'тижні': 'w', 'тижнів': 'w',
      'місяць': 'm', 'місяці': 'm', 'місяців': 'm',
      'рік': 'y', 'роки': 'y', 'років': 'y'
    };
    const shortUnit = unitMap[unit.toLowerCase()];
    if (shortUnit) {
      const result = `${amount}${shortUnit}`;
      console.log('Dynamic pattern match:', inputValue, '→', result);
      return result;
    }
  }
  
  console.log('No pattern match found for:', inputValue);
  // For other patterns, we'll fall back to date range conversion
  return undefined;
};
