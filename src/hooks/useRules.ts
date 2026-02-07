import { useState } from "react";
import type { Rule, Transaction, Filters } from "../types";

interface RulePreview {
  rule: Rule;
  affectedTransactions: Transaction[];
}

interface UseRulesReturn {
  rules: Rule[];
  createRuleFromFilters: (filters: Filters, category: string, name: string) => Rule;
  addRule: (rule: Rule) => void;
  removeRule: (ruleId: string) => void;
  previewRuleApplication: (rule: Rule, transactions: Transaction[]) => RulePreview;
  applyRules: (transactions: Transaction[]) => Transaction[];
  getUncategorizedTransactions: (transactions: Transaction[]) => Transaction[];
}

export const useRules = (): UseRulesReturn => {
  const [rules, setRules] = useState<Rule[]>([]);

  const createRuleFromFilters = (filters: Filters, category: string, name: string): Rule => {
    const rule: Rule = {
      id: Date.now().toString(),
      name,
      category,
      explanation: buildExplanation(filters),
      condition: (transaction: Transaction) => {
        // Check description filter
        if (filters.description && 
            !transaction.description.toLowerCase().includes(filters.description.toLowerCase())) {
          return false;
        }

        // Check MCC filter
        if (filters.mcc && !transaction.mcc.toString().includes(filters.mcc)) {
          return false;
        }

        // Check MCC codes (array)
        if (filters.mccCodes.length > 0 && 
            !filters.mccCodes.includes(transaction.mcc.toString())) {
          return false;
        }

        // Check search in description/comment
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          const matchesDescription = transaction.description.toLowerCase().includes(searchLower);
          const matchesComment = transaction.comment && 
            transaction.comment.toLowerCase().includes(searchLower);
          
          if (!matchesDescription && !matchesComment) {
            return false;
          }
        }

        // Check date range
        if (filters.dateRange) {
          if (filters.dateRange.start && transaction.time < filters.dateRange.start) {
            return false;
          }
          if (filters.dateRange.end && transaction.time > filters.dateRange.end) {
            return false;
          }
        }

        return true;
      }
    };

    return rule;
  };

  const buildExplanation = (filters: Filters): string => {
    const conditions = [];

    if (filters.description) {
      conditions.push(`опис містить "${filters.description}"`);
    }
    if (filters.mcc) {
      conditions.push(`MCC містить "${filters.mcc}"`);
    }
    if (filters.mccCodes.length > 0) {
      conditions.push(`MCC один із: ${filters.mccCodes.join(", ")}`);
    }
    if (filters.search) {
      conditions.push(`опис або коментар містить "${filters.search}"`);
    }
    if (filters.dateRange) {
      const parts = [];
      if (filters.dateRange.start) {
        parts.push(`після ${new Date(filters.dateRange.start * 1000).toLocaleDateString()}`);
      }
      if (filters.dateRange.end) {
        parts.push(`до ${new Date(filters.dateRange.end * 1000).toLocaleDateString()}`);
      }
      if (parts.length > 0) {
        conditions.push(`дата ${parts.join(" і ")}`);
      }
    }

    return conditions.length > 0 
      ? `Застосовувати, коли: ${conditions.join(" І ")}`
      : "Застосовувати до всіх транзакцій";
  };

  const addRule = (rule: Rule) => {
    setRules(prev => [...prev, rule]);
  };

  const removeRule = (ruleId: string) => {
    setRules(prev => prev.filter(rule => rule.id !== ruleId));
  };

  const previewRuleApplication = (rule: Rule, transactions: Transaction[]): RulePreview => {
    const uncategorizedTransactions = transactions.filter(tx => !tx.category);
    const affectedTransactions = uncategorizedTransactions.filter(rule.condition);
    
    return {
      rule,
      affectedTransactions
    };
  };

  const applyRules = (transactions: Transaction[]): Transaction[] => {
    return transactions.map(transaction => {
      // Only apply rules to uncategorized transactions
      if (transaction.category) {
        return transaction;
      }

      // Find first matching rule
      const matchingRule = rules.find(rule => rule.condition(transaction));
      
      if (matchingRule) {
        return {
          ...transaction,
          category: matchingRule.category
        };
      }

      return transaction;
    });
  };

  const getUncategorizedTransactions = (transactions: Transaction[]): Transaction[] => {
    return transactions.filter(tx => !tx.category);
  };

  return {
    rules,
    createRuleFromFilters,
    addRule,
    removeRule,
    previewRuleApplication,
    applyRules,
    getUncategorizedTransactions,
  };
};
