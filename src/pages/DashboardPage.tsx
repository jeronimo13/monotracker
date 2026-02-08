import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import mccData from "../data/mcc.json";
import type {
  AccountSource,
  AppExport,
  ClientInfo,
  Filters,
  Rule,
  Transaction,
  TransactionGroupingMode,
} from "../types";
import { getTransactionLabel } from "../utils/formatters";
import { getDateKey } from "../utils/dateHelpers";
import { useAppData } from "../hooks/useAppData";
import { useFilters } from "../hooks/useFilters";
import { useRules } from "../hooks/useRules";
import StatisticsScene from "../scenes/StatisticsScene";
import SidebarCategoryFacets from "../components/facets/SidebarCategoryFacets";
import SidebarMccFacets from "../components/facets/SidebarMccFacets";
import ChipComponent from "../components/ChipComponent";
import TabSwitcher from "../components/TabSwitcher";
import MonthlyBreakdown from "../components/MonthlyBreakdown";
import { ImportExportButtons } from "../components/ImportExportButtons";
import { RulesPanel } from "../components/RulesPanel";
import { ApiConfigPanel } from "../components/ApiConfigPanel";
import { DateRangeFilter } from "../components/DateRangeFilter";
import ThemeToggle from "../components/ThemeToggle";
import SettingsButton from "../components/SettingsButton";
import TerminalStatusBar, { type TerminalStatusMessage } from "../components/TerminalStatusBar";
import VirtualizedTransactionsTable from "../components/VirtualizedTransactionsTable";
import { readStoredData } from "../utils/storageData";

const TRANSACTION_GROUPING_STORAGE_KEY = "monobank-transaction-grouping-mode";
const ALL_TRANSACTIONS_GROUP_KEY = "__all_transactions__";

const TRANSACTION_GROUPING_OPTIONS: Array<{
  value: TransactionGroupingMode;
  label: string;
  description: string;
}> = [
  {
    value: "day",
    label: "По днях",
    description: "Показувати транзакції з заголовками по датах.",
  },
  {
    value: "month",
    label: "По місяцях",
    description: "Показувати транзакції з заголовками по місяцях.",
  },
  {
    value: "none",
    label: "Ніяк",
    description: "Не групувати, показувати суцільний список транзакцій.",
  },
];

const isTransactionGroupingMode = (value: string | null): value is TransactionGroupingMode => {
  return value === "day" || value === "month" || value === "none";
};

const getInitialTransactionGroupingMode = (): TransactionGroupingMode => {
  if (typeof window === "undefined") {
    return "day";
  }

  const storedMode = localStorage.getItem(TRANSACTION_GROUPING_STORAGE_KEY);
  return isTransactionGroupingMode(storedMode) ? storedMode : "day";
};

const getMonthGroupingKey = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const getGroupSortTimestamp = (groupKey: string, mode: TransactionGroupingMode): number => {
  if (mode === "month") {
    const [yearRaw, monthRaw] = groupKey.split("-");
    const year = Number(yearRaw);
    const monthIndex = Number(monthRaw) - 1;
    return new Date(year, monthIndex, 1).getTime();
  }

  if (mode === "day") {
    return new Date(groupKey).getTime();
  }

  return 0;
};

const DashboardPage: React.FC = () => {
  // Core data hooks
  const {
    transactions,
    categories,
    setTransactions,
    setCategories,
    clearData,
    loadSampleData,
    importData,
    connectToken,
    syncTransactions,
    isSyncing,
  } = useAppData();

  // UI state
  const [showCategoryInput, setShowCategoryInput] = useState<boolean>(false);
  const [newCategory, setNewCategory] = useState<string>("");
  const [showUncategorized, setShowUncategorized] = useState<boolean>(false);
  const [showWithdrawalsOnly, setShowWithdrawalsOnly] = useState<boolean>(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState<boolean>(false);
  const [filteredCategories, setFilteredCategories] = useState<string[]>([]);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<number>(-1);
  const [activeTab, setActiveTab] = useState<string>("transactions");
  const [dateSortDirection, setDateSortDirection] = useState<"asc" | "desc">("desc");
  const [transactionGroupingMode, setTransactionGroupingMode] = useState<TransactionGroupingMode>(
    getInitialTransactionGroupingMode
  );
  const [terminalStatus, setTerminalStatus] = useState<TerminalStatusMessage>({
    level: "info",
    text: "Система готова. Очікую на синхронізацію з Monobank.",
    timestamp: Date.now(),
  });
  const [searchParams] = useSearchParams();
  const isSettingsView = searchParams.get("view") === "settings";
  const hasAutoSyncTriggeredRef = useRef(false);
  const resolveTransactionSource = useCallback(
    (transaction: Transaction): string => transaction.accountId,
    []
  );

  const updateTerminalStatus = useCallback((status: Omit<TerminalStatusMessage, "timestamp">) => {
    setTerminalStatus({
      ...status,
      timestamp: Date.now(),
    });
  }, []);

  // Filtering hook
  const {
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
  } = useFilters(
    transactions,
    showUncategorized,
    showWithdrawalsOnly,
    resolveTransactionSource
  );

  // Rules hook
  const {
    rules,
    createRuleFromFilters,
    addRule,
    removeRule,
    previewRuleApplication,
    applyRules,
  } = useRules();

  const handleTokenConnected = useCallback(
    async (payload: { token: string; clientInfo: ClientInfo; source: AccountSource }) => {
      await connectToken({
        token: payload.token,
        clientInfo: payload.clientInfo,
        source: payload.source,
        onStatusChange: updateTerminalStatus,
      });
    },
    [connectToken, updateTerminalStatus]
  );

  const handleUseSampleData = useCallback(() => {
    loadSampleData();
  }, [loadSampleData]);

  const handleClearData = useCallback(() => {
    clearData();
  }, [clearData]);


  const addCategoryToFilteredTransactions = () => {
    if (!newCategory.trim()) return;

    const updatedTransactions = transactions.map((transaction) => {
      if (
        filteredTransactions.some((filtered) => filtered.id === transaction.id)
      ) {
        return { ...transaction, category: newCategory };
      }
      return transaction;
    });

    setTransactions(updatedTransactions);
    const updatedCategories = { ...categories, [newCategory]: newCategory };
    setCategories(updatedCategories);
    setNewCategory("");
    setShowCategoryInput(false);
    setShowCategoryDropdown(false);
    clearAllFilters();
  };

  const handleTableAddFilter = (type: keyof Filters, value: string) => {
    addFilter(type, value);

    if (type === "search" || type === "mcc") {
      if (!showCategoryInput) {
        setShowCategoryInput(true);
      }

      requestAnimationFrame(() => {
        categoryInputRef.current?.focus();
      });
    }
  };

  const handleCategoryInputChange = (value: string) => {
    setNewCategory(value);
    setSelectedCategoryIndex(-1);

    if (value.trim()) {
      const existingCategories = Object.keys(categories);
      const filtered = existingCategories.filter((cat) =>
        cat.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCategories(filtered);
      setShowCategoryDropdown(filtered.length > 0);
    } else {
      setShowCategoryDropdown(false);
    }
  };

  const selectCategory = (category: string) => {
    setNewCategory(category);
    setShowCategoryDropdown(false);
    setSelectedCategoryIndex(-1);
    
    const updatedTransactions = transactions.map((transaction) => {
      if (
        filteredTransactions.some((filtered) => filtered.id === transaction.id)
      ) {
        return { ...transaction, category: category };
      }
      return transaction;
    });

    setTransactions(updatedTransactions);
    const updatedCategories = { ...categories, [category]: category };
    setCategories(updatedCategories);
    setNewCategory("");
    setShowCategoryInput(false);
    clearAllFilters();

    setTimeout(() => {
      if (categoryInputRef.current) {
        categoryInputRef.current.focus();
      }
    }, 0);
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (showCategoryDropdown && filteredCategories.length > 0) {
          setSelectedCategoryIndex((prev) =>
            prev < filteredCategories.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (showCategoryDropdown && filteredCategories.length > 0) {
          setSelectedCategoryIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCategories.length - 1
          );
        }
        break;
      case "Enter":
        e.preventDefault();
        if (
          showCategoryDropdown &&
          selectedCategoryIndex >= 0 &&
          selectedCategoryIndex < filteredCategories.length
        ) {
          selectCategory(filteredCategories[selectedCategoryIndex]);
        } else {
          addCategoryToFilteredTransactions();
        }
        break;
      case "Escape":
        setShowCategoryDropdown(false);
        setSelectedCategoryIndex(-1);
        break;
    }
  };


  // Auto-show category input when search or MCC filter has content
  useEffect(() => {
    const shouldShow =
      (Boolean(filters.search) || Boolean(filters.mcc)) &&
      filteredTransactions.length > 0;
    if (shouldShow && !showCategoryInput) {
      setShowCategoryInput(true);
    } else if (!filters.search && !filters.mcc && showCategoryInput) {
      setShowCategoryInput(false);
    }
  }, [filters.search, filters.mcc, filteredTransactions.length, showCategoryInput]);

  useEffect(() => {
    localStorage.setItem(TRANSACTION_GROUPING_STORAGE_KEY, transactionGroupingMode);
  }, [transactionGroupingMode]);

  // Group transactions by date
  const sortedTransactions = useMemo(() => {
    const copy = [...filteredTransactions];
    copy.sort((a, b) =>
      dateSortDirection === "desc" ? b.time - a.time : a.time - b.time
    );
    return copy;
  }, [filteredTransactions, dateSortDirection]);

  const groupedTransactions = useMemo(
    () =>
      sortedTransactions.reduce(
        (groups, transaction) => {
          const dateKey =
            transactionGroupingMode === "month"
              ? getMonthGroupingKey(transaction.time)
              : transactionGroupingMode === "none"
                ? ALL_TRANSACTIONS_GROUP_KEY
                : getDateKey(transaction.time);
          if (!groups[dateKey]) {
            groups[dateKey] = [];
          }
          groups[dateKey].push(transaction);
          return groups;
        },
        {} as { [key: string]: Transaction[] }
      ),
    [sortedTransactions, transactionGroupingMode]
  );

  const sortedDates = useMemo(
    () => {
      const keys = Object.keys(groupedTransactions);
      if (transactionGroupingMode === "none") {
        return keys;
      }

      return keys.sort((a, b) =>
        dateSortDirection === "desc"
          ? getGroupSortTimestamp(b, transactionGroupingMode) -
            getGroupSortTimestamp(a, transactionGroupingMode)
          : getGroupSortTimestamp(a, transactionGroupingMode) -
            getGroupSortTimestamp(b, transactionGroupingMode)
      );
    },
    [groupedTransactions, dateSortDirection, transactionGroupingMode]
  );

  const totalCount = filteredTransactions.length;

  const getMccDescription = (mccCode: number): string => {
    return mccData[mccCode.toString() as keyof typeof mccData] || "";
  };

  // Rules handling
  const handleCreateRule = (rule: Rule) => {
    addRule(rule);
  };

  const handlePreviewRule = (rule: Rule) => {
    previewRuleApplication(rule, transactions);
  };

  const handleApplyRules = () => {
    const updatedTransactions = applyRules(transactions);
    setTransactions(updatedTransactions);
  };

  const handleImport = (data: AppExport) => {
    const appData = {
      transactions: data.transactions,
      categories: data.categories,
    };
    importData(appData);
    
    // Import rules if available
    if (data.rules) {
      data.rules.forEach(rule => addRule(rule));
    }
  };

  useEffect(() => {
    if (hasAutoSyncTriggeredRef.current || isSyncing) {
      return;
    }

    const stored = readStoredData();
    if (!stored) {
      return;
    }

    const hasToken = typeof stored.token === "string" && stored.token.trim() !== "";
    const needsInitialSync = Boolean(stored.sync?.needsInitialSync);
    const hasSuccessfulSync = typeof stored.sync?.lastSuccessfulSyncAt === "number";
    const wasInterruptedSync =
      stored.sync?.status === "syncing" || stored.sync?.status === "cooldown";
    const shouldForceResume = wasInterruptedSync;

    if (!hasToken || (!needsInitialSync && hasSuccessfulSync && !shouldForceResume)) {
      return;
    }

    hasAutoSyncTriggeredRef.current = true;
    void syncTransactions({
      source: "onboarding",
      force: shouldForceResume,
      onStatusChange: updateTerminalStatus,
    }).catch((error) => {
      console.error("Auto-sync failed:", error);
    });
  }, [isSyncing, syncTransactions, updateTerminalStatus]);

  return (
    <div className="min-h-screen bg-gray-50 flex pb-12">
      {/* Left panel */}
      {!isSettingsView && (
      <div className="w-1/5 h-screen overflow-y-auto bg-gray-50 p-3 sticky top-0">
            {/* Date Range Filter */}
            <div className="dashboard-panel p-3 mb-2">
              <DateRangeFilter />
            </div>

            {/* Rules Panel */}
            <div className="dashboard-panel p-3 mb-2">
              <RulesPanel
                rules={rules}
                filters={filters}
                transactions={transactions}
                categories={categories}
                onCreateRule={handleCreateRule}
                onRemoveRule={removeRule}
                onPreviewRules={handlePreviewRule}
                onApplyRules={handleApplyRules}
                createRuleFromFilters={createRuleFromFilters}
              />
            </div>

            {/* Special Filters */}
            <div className="dashboard-panel p-3 mb-2">
              <div className="flex flex-col gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Без категорії
                    </span>
                    <button
                      onClick={() => setShowUncategorized(!showUncategorized)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                        showUncategorized ? "bg-purple-600" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          showUncategorized ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Тільки відʼємні транзакції
                    </span>
                    <button
                      onClick={() => setShowWithdrawalsOnly(!showWithdrawalsOnly)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                        showWithdrawalsOnly ? "bg-red-600" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          showWithdrawalsOnly ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-panel p-3 mb-2">
              <SidebarCategoryFacets
                transactions={transactions}
                selectedCategories={filters.categories}
                onCategoryToggle={toggleCategoryFacet}
                onCategoryOnly={setCategoryFacetOnly}
                onClearAll={clearCategoryFacets}
              />
            </div>

            <div className="dashboard-panel p-3 mb-2">
              <SidebarMccFacets
                transactions={transactions}
                selectedMccCodes={filters.mccCodes}
                onMccToggle={toggleMccFacet}
                onMccOnly={setMccFacetOnly}
                onClearAll={clearMccFacets}
                mccData={mccData}
              />
            </div>
          </div>
      )}

      {/* Right panel */}
      <div className="flex-1 h-screen flex flex-col p-3">
            {isSettingsView ? (
              <div className="mx-auto max-w-2xl py-2 overflow-y-auto flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-2xl font-bold text-gray-900">Налаштування</h1>
                  <div className="flex items-center gap-2">
                    <SettingsButton />
                    <ThemeToggle />
                  </div>
                </div>
                <div className="mb-4">
                  <p className="mt-1 text-sm text-gray-500">
                    Керуйте підключенням до API, імпортом та експортом даних.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="dashboard-panel p-6">
                    <h2 className="text-base font-semibold text-gray-900">Групування транзакцій</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Оберіть, як групувати список транзакцій у вкладці "Список транзакцій".
                    </p>
                    <div className="mt-4 space-y-2">
                      {TRANSACTION_GROUPING_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                            transactionGroupingMode === option.value
                              ? "border-blue-300 bg-blue-50"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="transaction-grouping-mode"
                            value={option.value}
                            checked={transactionGroupingMode === option.value}
                            onChange={() => setTransactionGroupingMode(option.value)}
                            className="mt-0.5 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{option.label}</p>
                            <p className="text-xs text-gray-500">{option.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="dashboard-panel p-6">
                    <ImportExportButtons
                      transactions={transactions}
                      categories={categories}
                      rules={rules}
                      onImport={handleImport}
                      onStatusChange={updateTerminalStatus}
                    />
                  </div>

                  <ApiConfigPanel
                    onTokenConnected={handleTokenConnected}
                    onUseSampleData={handleUseSampleData}
                    onClearData={handleClearData}
                    hasTransactions={transactions.length > 0}
                    onStatusChange={updateTerminalStatus}
                  />
                </div>
              </div>
            ) : (
              <>
            {/* Controls bar */}
            <div className="dashboard-panel px-3 py-2 mb-2 shrink-0 flex items-center justify-end">
              <div className="flex items-center gap-2">
                <SettingsButton />
                <ThemeToggle />
              </div>
            </div>

            {/* Tab Content */}
            <div className="dashboard-panel overflow-hidden flex-1 flex flex-col min-h-0">
              <div className="px-3 py-2 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <TabSwitcher
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    tabs={[
                      { id: "transactions", label: "Список транзакцій" },
                      { id: "monthly", label: "Щомісячний аналіз" },
                    ]}
                  />
                  <div className="flex items-center gap-4 ml-4">
                    <StatisticsScene filteredTransactions={filteredTransactions} />
                    {activeTab === "transactions" && (
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {getTransactionLabel(totalCount)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={filters.search}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          search: e.target.value,
                        }))
                      }
                      placeholder="Пошук по опису, коментарю або категорії..."
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    />
                  </div>
                  {filters.search && (
                    <button
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, search: "" }))
                      }
                      className="px-2 py-1 text-gray-500 hover:text-gray-700"
                      title="Очистити пошук"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Category Input */}
                {showCategoryInput && (
                  <div className="mb-2 p-2 bg-purple-50 rounded">
                    <div className="flex gap-2 relative">
                      <div className="flex-1 relative">
                        <input
                          ref={categoryInputRef}
                          type="text"
                          value={newCategory}
                          onChange={(e) => handleCategoryInputChange(e.target.value)}
                          onKeyDown={handleCategoryKeyDown}
                          placeholder="Введіть назву категорії"
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                        />
                        {showCategoryDropdown && (
                          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {filteredCategories.map((category, index) => (
                              <div
                                key={category}
                                className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-100 text-black ${
                                  index === selectedCategoryIndex
                                    ? "bg-blue-100"
                                    : ""
                                }`}
                                onClick={() => selectCategory(category)}
                                onMouseEnter={() => setSelectedCategoryIndex(index)}
                                onMouseLeave={() => setSelectedCategoryIndex(-1)}
                              >
                                {category}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={addCategoryToFilteredTransactions}
                        className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                      >
                        Додати
                      </button>
                    </div>
                  </div>
                )}

                {(filters.description ||
                  filters.mcc ||
                  filters.mccCodes.length > 0 ||
                  filters.category ||
                  filters.categories.length > 0 ||
                  filters.source ||
                  filters.search
                ) && (
                  <div className="flex flex-wrap gap-1.5 items-center mb-2">
                    {filters.description && (
                      <ChipComponent
                        label={`Опис: ${filters.description}`}
                        variant="primary"
                        removable
                        onRemove={() => removeFilter("description")}
                        size="medium"
                      />
                    )}
                    {filters.mcc && (
                      <ChipComponent
                        label={`MCC: ${filters.mcc}`}
                        variant="success"
                        removable
                        onRemove={() => removeFilter("mcc")}
                        size="medium"
                      />
                    )}
                    {filters.category && (
                      <ChipComponent
                        label={`Категорія: ${filters.category}`}
                        variant="secondary"
                        removable
                        onRemove={() => removeFilter("category")}
                        size="medium"
                      />
                    )}
                    {filters.source && (
                      <ChipComponent
                        label={`Джерело (accountId): ${filters.source}`}
                        variant="warning"
                        removable
                        onRemove={() => removeFilter("source")}
                        size="medium"
                      />
                    )}
                    {filters.categories.map((category) => (
                      <ChipComponent
                        key={`facet-${category}`}
                        label={`Фільтр: ${category}`}
                        variant="primary"
                        removable
                        onRemove={() => toggleCategoryFacet(category)}
                        size="medium"
                      />
                    ))}
                    {filters.mccCodes.map((mccCode) => (
                      <ChipComponent
                        key={`mcc-facet-${mccCode}`}
                        label={`MCC: ${mccCode}`}
                        variant="success"
                        removable
                        onRemove={() => toggleMccFacet(mccCode)}
                        size="medium"
                      />
                    ))}
                    {filters.search && (
                      <ChipComponent
                        label={`Пошук: ${filters.search}`}
                        variant="warning"
                        removable
                        onRemove={() =>
                          setFilters((prev) => ({ ...prev, search: "" }))
                        }
                        size="medium"
                      />
                    )}
                    <button
                      onClick={clearAllFilters}
                      className="text-xs text-gray-600 hover:text-gray-800 px-2 py-0.5 rounded border border-gray-300 hover:bg-gray-50"
                    >
                      Очистити все
                    </button>
                  </div>
                )}
              </div>

              {activeTab === "transactions" && (
                <VirtualizedTransactionsTable
                  sortedDates={sortedDates}
                  groupedTransactions={groupedTransactions}
                  groupingMode={transactionGroupingMode}
                  dateSortDirection={dateSortDirection}
                  onToggleDateSort={() =>
                    setDateSortDirection((prev) =>
                      prev === "desc" ? "asc" : "desc"
                    )
                  }
                  onAddFilter={handleTableAddFilter}
                  getMccDescription={getMccDescription}
                />
              )}

              {activeTab === "monthly" && (
                <div className="overflow-y-auto flex-1">
                  <MonthlyBreakdown transactions={filteredTransactions} />
                </div>
              )}
            </div>
              </>
            )}
          <TerminalStatusBar message={terminalStatus} />
          </div>
    </div>
  );
};

export default DashboardPage;
