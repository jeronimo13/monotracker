import React, { useState, useEffect, useRef } from "react";
import mccData from "../data/mcc.json";
import type { Transaction, AppExport } from "../types";
import {
  formatAmount,
  formatOriginalAmount,
  formatDate,
  formatDateHeader,
  getCurrencyCode,
  getTransactionLabel,
} from "../utils/formatters";
import { getDateKey } from "../utils/dateHelpers";
import { useAppData } from "../hooks/useAppData";
import { useFilters } from "../hooks/useFilters";
import { useRules } from "../hooks/useRules";
import StatisticsScene from "../scenes/StatisticsScene";
import SidebarCategoryFacets from "../components/facets/SidebarCategoryFacets";
import SidebarMccFacets from "../components/facets/SidebarMccFacets";
import ChipComponent from "../components/ChipComponent";
import Tooltip from "../components/Tooltip";
import TabSwitcher from "../components/TabSwitcher";
import MonthlyBreakdown from "../components/MonthlyBreakdown";
import { ImportExportButtons } from "../components/ImportExportButtons";
import { RulesPanel } from "../components/RulesPanel";
import { ApiConfigPanel } from "../components/ApiConfigPanel";
import { DateRangeFilter } from "../components/DateRangeFilter";

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
  } = useFilters(transactions, showUncategorized, showWithdrawalsOnly);

  // Rules hook
  const {
    rules,
    createRuleFromFilters,
    addRule,
    removeRule,
    previewRuleApplication,
    applyRules,
  } = useRules();

  // Handle API token updates from ApiConfigPanel
  const handleTokenUpdate = (newTransactions: Transaction[]) => {
    if (newTransactions.length === 1 && newTransactions[0] === -1 as any) {
      // Special signal to load sample data
      loadSampleData();
    } else if (newTransactions.length === 0) {
      // Clear all data
      clearData();
    } else {
      // New transactions from API
      setTransactions(newTransactions);
    }
  };


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


  // Auto-show category input when filters are applied
  useEffect(() => {
    const hasFilters =
      filters.description || filters.mcc || filters.category || filters.search;
    if (hasFilters && filteredTransactions.length > 0 && !showCategoryInput) {
      setShowCategoryInput(true);
      const hasSpecificFilters =
        filters.description || filters.mcc || filters.category;
      if (hasSpecificFilters) {
        setTimeout(() => {
          if (categoryInputRef.current) {
            categoryInputRef.current.focus();
          }
        }, 100);
      }
    }
  }, [filters, filteredTransactions.length, showCategoryInput]);

  // Group transactions by date
  const groupedTransactions = filteredTransactions.reduce(
    (groups, transaction) => {
      const dateKey = getDateKey(transaction.time);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(transaction);
      return groups;
    },
    {} as { [key: string]: Transaction[] }
  );

  const sortedDates = Object.keys(groupedTransactions).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const totalCount = filteredTransactions.length;

  const getMccDescription = (mccCode: number): string => {
    return mccData[mccCode.toString() as keyof typeof mccData] || "";
  };

  // Rules handling
  const handleCreateRule = (rule: any) => {
    addRule(rule);
  };

  const handlePreviewRule = (rule: any) => {
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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left panel */}
      <div className="w-1/5 h-screen overflow-y-auto bg-gray-50 p-4 sticky top-0">
            {/* Date Range Filter */}
            <div className="dashboard-panel p-4 mb-6">
              <DateRangeFilter />
            </div>

            {/* Import/Export */}
            <div className="dashboard-panel p-4 mb-6">
              <ImportExportButtons
                transactions={transactions}
                categories={categories}
                rules={rules}
                onImport={handleImport}
              />
            </div>

            {/* Rules Panel */}
            <div className="dashboard-panel p-4 mb-6">
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
            <div className="dashboard-panel p-4 mb-6">
              <div className="flex flex-col gap-4">
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

            <div className="dashboard-panel p-4 mb-6">
              <SidebarCategoryFacets
                transactions={transactions}
                selectedCategories={filters.categories}
                onCategoryToggle={toggleCategoryFacet}
                onCategoryOnly={setCategoryFacetOnly}
                onClearAll={clearCategoryFacets}
              />
            </div>

            <div className="dashboard-panel p-4 mb-6">
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

      {/* Right panel */}
      <div className="flex-1 h-screen overflow-y-auto p-4">
            <ApiConfigPanel onTokenUpdate={handleTokenUpdate} />
            
            <div className="dashboard-panel p-6 mb-6">
              <StatisticsScene filteredTransactions={filteredTransactions} />
            </div>

            {/* Filters Bar */}
            <div className="dashboard-panel p-4 mb-6">
              <div className="mb-4">
                <div className="flex items-center gap-3">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    />
                  </div>
                  {filters.search && (
                    <button
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, search: "" }))
                      }
                      className="px-3 py-2 text-gray-500 hover:text-gray-700"
                      title="Очистити пошук"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Category Input */}
              {showCategoryInput && (
                <div className="mb-3 p-3 bg-purple-50 rounded-lg">
                  <div className="flex gap-2 relative">
                    <div className="flex-1 relative">
                      <input
                        ref={categoryInputRef}
                        type="text"
                        value={newCategory}
                        onChange={(e) => handleCategoryInputChange(e.target.value)}
                        onKeyDown={handleCategoryKeyDown}
                        placeholder="Введіть назву категорії"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                      />
                      {showCategoryDropdown && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {filteredCategories.map((category, index) => (
                            <div
                              key={category}
                              className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-black ${
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
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                    >
                      Додати
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 items-center">
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
                {(filters.description ||
                  filters.mcc ||
                  filters.mccCodes.length > 0 ||
                  filters.category ||
                  filters.categories.length > 0 ||
                  filters.search
                ) && (
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-gray-600 hover:text-gray-800 px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                  >
                    Очистити все
                  </button>
                )}
              </div>
            </div>

            {/* Tab Content */}
            <div className="dashboard-panel overflow-hidden">
              <div className="px-6 py-4">
                <TabSwitcher
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  tabs={[
                    { id: "transactions", label: "Список транзакцій" },
                    { id: "monthly", label: "Щомісячний аналіз" },
                  ]}
                />
              </div>

              {activeTab === "transactions" && (
                <>
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {getTransactionLabel(totalCount)}
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Дата
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Опис
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            MCC
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Категорія
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Сума в валюті
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Сума
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sortedDates.map((dateKey) => (
                          <React.Fragment key={dateKey}>
                            <tr className="bg-gray-100">
                              <td
                                colSpan={6}
                                className="px-6 py-3 text-sm text-gray-900"
                              >
                                {formatDateHeader(dateKey)}
                              </td>
                            </tr>
                            {groupedTransactions[dateKey].map((transaction, index) => (
                              <tr
                                key={transaction.id}
                                className={`${
                                  index % 2 === 0 ? "bg-white" : "bg-gray-50"
                                } hover:bg-gray-100 transition-colors duration-150`}
                              >
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <div className="flex items-center space-x-2">
                                    <span>{formatDate(transaction.time)}</span>
                                    {transaction.hold && (
                                      <Tooltip content="Транзакція утримана (не завершена)">
                                        <span className="text-yellow-600 text-xs">⏳</span>
                                      </Tooltip>
                                    )}
                                    {(transaction.receiptId || transaction.invoiceId) && (
                                      <Tooltip content={`Є чек/рахунок: ${transaction.receiptId || transaction.invoiceId}`}>
                                        <span className="text-blue-600 text-xs">🧾</span>
                                      </Tooltip>
                                    )}
                                    {transaction.counterEdrpou && (
                                      <Tooltip content={`Бізнес транзакція: ЄДРПОУ ${transaction.counterEdrpou}`}>
                                        <span className="text-purple-600 text-xs">💼</span>
                                      </Tooltip>
                                    )}
                                    {transaction.counterIban && (
                                      <Tooltip content={`Переказ: ${transaction.counterIban}`}>
                                        <span className="text-green-600 text-xs">🏦</span>
                                      </Tooltip>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  <div>
                                    <Tooltip content={
                                      [
                                        `Опис: ${transaction.description}`,
                                        transaction.comment && `Коментар: ${transaction.comment}`,
                                        transaction.receiptId && `ID чеку: ${transaction.receiptId}`,
                                        transaction.invoiceId && `ID рахунку: ${transaction.invoiceId}`,
                                        transaction.originalMcc !== transaction.mcc && `Оригінальний MCC: ${transaction.originalMcc}`
                                      ].filter(Boolean).join('\n')
                                    }>
                                      <button
                                        onClick={() =>
                                          addFilter("description", transaction.description)
                                        }
                                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                                      >
                                        {transaction.description}
                                      </button>
                                    </Tooltip>
                                    {transaction.comment && (
                                      <div className="text-gray-500 text-xs mt-1">
                                        {transaction.comment}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                  <div>
                                    <button
                                      onClick={() =>
                                        addFilter("mcc", transaction.mcc.toString())
                                      }
                                      className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                    >
                                      {transaction.mcc || "-"}
                                    </button>
                                    {getMccDescription(transaction.mcc) && (
                                      <Tooltip content={getMccDescription(transaction.mcc)}>
                                        <div className="text-xs text-gray-400 mt-1 truncate max-w-32 pointer-events-none">
                                          {getMccDescription(transaction.mcc)}
                                        </div>
                                      </Tooltip>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <button
                                    onClick={() =>
                                      addFilter("category", transaction.category || "")
                                    }
                                    className="text-purple-600 hover:text-purple-800 hover:underline cursor-pointer"
                                  >
                                    {transaction.category || "-"}
                                  </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                                  {transaction.operationAmount !== transaction.amount ? (
                                    <span>
                                      {transaction.operationAmount > 0 ? "+" : ""}
                                      {formatOriginalAmount(transaction.operationAmount)}
                                      <span className="text-xs ml-1">
                                        {getCurrencyCode(transaction.currencyCode)}
                                      </span>
                                    </span>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                  <Tooltip content={
                                    [
                                      `Сума: ${formatAmount(transaction.amount)}`,
                                      `Залишок після: ${formatAmount(transaction.balance)}`,
                                      transaction.commissionRate > 0 && `Комісія: ${transaction.commissionRate}%`,
                                      transaction.cashbackAmount > 0 && `Кешбек: ${formatAmount(transaction.cashbackAmount)}`,
                                      transaction.operationAmount !== transaction.amount && `В валюті операції: ${formatOriginalAmount(transaction.operationAmount)} ${getCurrencyCode(transaction.currencyCode)}`
                                    ].filter(Boolean).join('\n')
                                  }>
                                    <span
                                      className={`font-medium cursor-help ${
                                        transaction.amount > 0
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      {transaction.amount > 0 ? "+" : ""}
                                      {formatAmount(transaction.amount)}
                                    </span>
                                  </Tooltip>
                                  {transaction.cashbackAmount > 0 && (
                                    <div className="text-green-500 text-xs mt-1">
                                      Кешбек: {formatAmount(transaction.cashbackAmount)}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {activeTab === "monthly" && (
                <MonthlyBreakdown transactions={filteredTransactions} />
              )}
            </div>
      </div>
    </div>
  );
};

export default DashboardPage;
