import React, { useEffect } from "react";
import { useDateRange } from "../hooks/useDateRange";

export const DateRangeFilter: React.FC = () => {
  const {
    dateRange,
    inputValue,
    isDropdownOpen,
    setIsDropdownOpen,
    selectedIndex,
    setSelectedIndex,
    handleInputChange,
    applyDateRange,
    handlePresetSelect,
    handleAllTimeSelect,
    inputRef,
    dropdownRef,
    skipBlurRef,
    presets,
    clearDateRange,
  } = useDateRange();

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyDateRange(inputValue);
      setIsDropdownOpen(false);
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isDropdownOpen) {
        setIsDropdownOpen(true);
      } else {
        setSelectedIndex(
          selectedIndex < presets.length - 1 ? selectedIndex + 1 : selectedIndex
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : -1);
    } else if (e.key === "Tab") {
      if (isDropdownOpen && selectedIndex >= 0) {
        e.preventDefault();
        handlePresetSelect(presets[selectedIndex]);
      } else {
        setIsDropdownOpen(false);
      }
    }
  };

  const handleInputBlur = () => {
    // Don't apply date range if a preset was just selected
    setTimeout(() => {
      if (!skipBlurRef.current) {
        applyDateRange(inputValue);
        setIsDropdownOpen(false);
      }
      setSelectedIndex(-1);
    }, 50);
  };

  const handleClear = () => {
    clearDateRange();
    setIsDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-900">
            Діапазон дат
          </label>
          {dateRange && (
            <button
              onClick={handleClear}
              className="text-xs text-red-600 hover:text-red-800 font-medium"
            >
              Очистити
            </button>
          )}
        </div>

        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onFocus={() => setIsDropdownOpen(true)}
            onBlur={handleInputBlur}
            placeholder="Введіть діапазон (напр., 7d, 2w, 3m) або оберіть зі списку..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
          />

          {/* Dropdown arrow */}
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg
              className="w-4 h-4 text-gray-500"
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
          </div>
        </div>

        {/* Dropdown */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
            {presets.map((preset, index) => (
              <button
                key={preset.value}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blur
                  handlePresetSelect(preset);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex justify-between items-center ${
                  index === selectedIndex ? "bg-blue-50" : ""
                }`}
              >
                <span className="text-gray-900">{preset.label}</span>
                <span className="text-gray-500 text-xs">
                  {preset.shorthand}
                </span>
              </button>
            ))}

            {/* Separator */}
            <div className="border-t border-gray-200 my-1" />

            {/* All time option */}
            <button
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent blur
                handleAllTimeSelect();
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 text-gray-900"
            >
              Весь час
            </button>
          </div>
        )}

        {/* Help text */}
        <div className="text-xs text-gray-400">
          {dateRange && dateRange.start && dateRange.end
            ? `Обрано: ${new Date(
                dateRange.start * 1000
              ).toLocaleDateString()} - ${new Date(
                dateRange.end * 1000
              ).toLocaleDateString()}`
            : "Оберіть діапазон дат для фільтрації транзакцій"}
        </div>
      </div>
    </div>
  );
};
