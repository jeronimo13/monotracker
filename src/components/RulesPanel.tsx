import React, { useState } from "react";
import type { Rule, Transaction, Filters } from "../types";

interface RulesPanelProps {
  rules: Rule[];
  filters: Filters;
  transactions: Transaction[];
  categories: { [key: string]: string };
  onCreateRule: (rule: Rule) => void;
  onRemoveRule: (ruleId: string) => void;
  onPreviewRules: (rule: Rule) => void;
  onApplyRules: () => void;
  createRuleFromFilters: (filters: Filters, category: string, name: string) => Rule;
}

export const RulesPanel: React.FC<RulesPanelProps> = ({
  rules,
  filters,
  transactions,
  categories,
  onCreateRule,
  onRemoveRule,
  onPreviewRules,
  onApplyRules,
  createRuleFromFilters,
}) => {
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [ruleCategory, setRuleCategory] = useState("");

  const hasActiveFilters = filters.description || 
    filters.mcc || 
    filters.mccCodes.length > 0 || 
    filters.search;

  const uncategorizedCount = transactions.filter(tx => !tx.category).length;

  const handleCreateRule = () => {
    if (!ruleName.trim() || !ruleCategory.trim()) {
      return;
    }

    const rule = createRuleFromFilters(filters, ruleCategory, ruleName);
    onCreateRule(rule);
    setRuleName("");
    setRuleCategory("");
    setShowCreateRule(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Правила автокатегоризації</h3>
        <div className="text-xs text-gray-500">
          {uncategorizedCount} транзакцій без категорії
        </div>
      </div>

      {/* Create rule from filters */}
      {hasActiveFilters && (
        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-800 mb-2">
            Створіть правило з поточних фільтрів для автокатегоризації схожих транзакцій
          </p>
          <button
            onClick={() => setShowCreateRule(!showCreateRule)}
            className="px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
          >
            {showCreateRule ? "Скасувати" : "Створити правило з фільтрів"}
          </button>
        </div>
      )}

      {/* Rule creation form */}
      {showCreateRule && hasActiveFilters && (
        <div className="p-3 bg-gray-50 rounded-lg space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Назва правила
            </label>
            <input
              type="text"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="наприклад: Покупки в АТБ"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Категорія
            </label>
            <input
              type="text"
              value={ruleCategory}
              onChange={(e) => setRuleCategory(e.target.value)}
              placeholder="наприклад: Продукти"
              list="categories"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <datalist id="categories">
              {Object.keys(categories).map(category => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreateRule}
              disabled={!ruleName.trim() || !ruleCategory.trim()}
              className="flex-1 px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
            >
              Створити правило
            </button>
            <button
              onClick={() => setShowCreateRule(false)}
              className="flex-1 px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
            >
              Скасувати
            </button>
          </div>
        </div>
      )}

      {/* Existing rules */}
      <div className="space-y-2">
        {rules.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            Поки немає правил. Застосуйте фільтри та створіть перше правило.
          </p>
        ) : (
          rules.map((rule) => (
            <div key={rule.id} className="p-3 border rounded-lg bg-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-gray-900">{rule.name}</h4>
                  <p className="text-xs text-gray-600 mb-1">→ {rule.category}</p>
                  <p className="text-xs text-gray-500">{rule.explanation}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => onPreviewRules(rule)}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Перегляд
                  </button>
                  <button
                    onClick={() => onRemoveRule(rule.id)}
                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Видалити
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Apply rules button */}
      {rules.length > 0 && uncategorizedCount > 0 && (
        <button
          onClick={onApplyRules}
          className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          Застосувати всі правила ({uncategorizedCount} транзакцій без категорії)
        </button>
      )}
    </div>
  );
};
