import React, { createContext, useState, useRef } from "react";
import { 
  parseNaturalDateRange,
  getDateRangePresets,
  type DateRangePreset 
} from "../utils/dateRangeParser";


interface DateRangeContextType {
  // Global date range state
  dateRange: { start?: number; end?: number } | undefined;
  setDateRange: (start?: number, end?: number) => void;
  clearDateRange: () => void;
  
  // DateRangeFilter UI state
  inputValue: string;
  setInputValue: (value: string) => void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (open: boolean) => void;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  
  // DateRangeFilter logic
  handleInputChange: (value: string) => void;
  applyDateRange: (input: string) => void;
  handlePresetSelect: (preset: DateRangePreset) => void;
  handleAllTimeSelect: () => void;
  
  // Refs for DateRangeFilter
  inputRef: React.RefObject<HTMLInputElement | null>;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  skipBlurRef: React.RefObject<boolean>;
  
  // Presets
  presets: DateRangePreset[];
}

export const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

export const DateRangeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Global state
  const [dateRange, setDateRangeState] = useState<{ start?: number; end?: number } | undefined>(undefined);
  
  // UI state for DateRangeFilter
  const [inputValue, setInputValue] = useState("Весь час");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  // Refs for DateRangeFilter
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const skipBlurRef = useRef<boolean>(false);
  
  const presets = getDateRangePresets();
  
  const setDateRange = (start?: number, end?: number) => {
    if (start && end) {
      setDateRangeState({ start, end });
    } else {
      setDateRangeState(undefined);
    }
  };
  
  const clearDateRange = () => {
    setDateRangeState(undefined);
    setInputValue("Весь час");
  };
  
  const handleInputChange = (value: string) => {
    setInputValue(value);
    setSelectedIndex(-1);
  };
  
  const applyDateRange = (input: string) => {
    if (!input.trim()) {
      clearDateRange();
      return;
    }
    
    const parsed = parseNaturalDateRange(input);
    if (parsed) {
      setDateRange(parsed.start, parsed.end);
      setInputValue(parsed.display);
    } else {
      // Invalid input, revert to current state
      setInputValue("Весь час");
    }
  };
  
  const handlePresetSelect = (preset: DateRangePreset) => {
    skipBlurRef.current = true;
    
    const parsed = parseNaturalDateRange(preset.value);
    if (parsed) {
      setDateRange(parsed.start, parsed.end);
      setInputValue(parsed.display);
    }
    setIsDropdownOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
    setTimeout(() => {
      skipBlurRef.current = false;
    }, 100);
  };
  
  const handleAllTimeSelect = () => {
    skipBlurRef.current = true;
    clearDateRange();
    setIsDropdownOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
    setTimeout(() => {
      skipBlurRef.current = false;
    }, 100);
  };
  
  return (
    <DateRangeContext.Provider value={{
      // Global state
      dateRange,
      setDateRange,
      clearDateRange,
      
      // UI state
      inputValue,
      setInputValue,
      isDropdownOpen,
      setIsDropdownOpen,
      selectedIndex,
      setSelectedIndex,
      
      // Logic
      handleInputChange,
      applyDateRange,
      handlePresetSelect,
      handleAllTimeSelect,
      
      // Refs
      inputRef,
      dropdownRef,
      skipBlurRef,
      
      // Presets
      presets,
    }}>
      {children}
    </DateRangeContext.Provider>
  );
};
