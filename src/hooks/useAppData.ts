import { useState, useEffect } from "react";
import type { Transaction, StoredData } from "../types";
import transactionData from "../data/transactions.json";

interface AppData {
  transactions: Transaction[];
  categories: { [key: string]: string };
}

interface UseAppDataReturn extends AppData {
  setTransactions: (transactions: Transaction[]) => void;
  setCategories: (categories: { [key: string]: string }) => void;
  saveData: () => void;
  clearData: () => void;
  loadSampleData: () => void;
  importData: (data: AppData) => void;
  exportData: () => AppData;
}

export const useAppData = (): UseAppDataReturn => {
  const [transactions, setTransactionsState] = useState<Transaction[]>([]);
  const [categories, setCategoriesState] = useState<{ [key: string]: string }>({});

  // Load data from localStorage on mount
  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = () => {
    // Backward compatibility: migrate onboarding token into primary storage.
    try {
      const onboardingToken = localStorage.getItem("onboarding-token")?.trim();
      if (onboardingToken) {
        const existing = localStorage.getItem("monobankData");
        if (existing) {
          const existingData = JSON.parse(existing);
          if (!existingData.token) {
            const migratedData: StoredData = {
              token: onboardingToken,
              transactions: Array.isArray(existingData.transactions) ? existingData.transactions : [],
              timestamp: Date.now(),
              useRealData: Boolean(existingData.useRealData),
              categories:
                existingData.categories && typeof existingData.categories === "object"
                  ? existingData.categories
                  : {},
            };
            localStorage.setItem("monobankData", JSON.stringify(migratedData));
          }
        } else {
          const migratedData: StoredData = {
            token: onboardingToken,
            transactions: [],
            timestamp: Date.now(),
            useRealData: false,
            categories: {},
          };
          localStorage.setItem("monobankData", JSON.stringify(migratedData));
        }
        localStorage.removeItem("onboarding-token");
      }
    } catch (error) {
      console.error("Error migrating onboarding token:", error);
    }

    try {
      const stored = localStorage.getItem("monobankData");
      if (stored) {
        const data: StoredData = JSON.parse(stored);
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        // Check if stored data is less than 24 hours old
        if (now - data.timestamp < oneDay) {
          setTransactionsState(data.transactions);
          setCategoriesState(data.categories || {});
          return;
        } else {
          // Data is old, remove it
          localStorage.removeItem("monobankData");
        }
      }
    } catch (error) {
      console.error("Error loading stored data:", error);
      localStorage.removeItem("monobankData");
    }

    // Load sample data if no stored data and no transactions currently loaded
    setTransactionsState(transactionData.transactions);
  };

  // Clean up unused categories
  const cleanupUnusedCategories = (
    transactionsToCheck: Transaction[],
    currentCategories: { [key: string]: string }
  ): { [key: string]: string } => {
    const usedCategories = new Set(
      transactionsToCheck
        .map((tx) => tx.category)
        .filter((cat) => cat !== undefined && cat !== null && cat.trim() !== "")
    );

    const cleanedCategories: { [key: string]: string } = {};
    Object.entries(currentCategories).forEach(([key, value]) => {
      if (usedCategories.has(key)) {
        cleanedCategories[key] = value;
      }
    });

    return cleanedCategories;
  };

  const saveData = () => {
    try {
      const cleanedCategories = cleanupUnusedCategories(transactions, categories);
      
      // Get existing token and useRealData from localStorage if available
      let existingToken = "";
      let existingUseRealData = false;
      try {
        const existing = localStorage.getItem("monobankData");
        if (existing) {
          const existingData = JSON.parse(existing);
          existingToken = existingData.token || "";
          existingUseRealData = existingData.useRealData || false;
        }
      } catch (error) {
        console.error("Error reading existing data:", error);
      }

      const data: StoredData = {
        token: existingToken,
        transactions,
        timestamp: Date.now(),
        useRealData: existingUseRealData,
        categories: cleanedCategories,
      };
      
      localStorage.setItem("monobankData", JSON.stringify(data));

      // Update categories state if cleanup removed any
      if (Object.keys(cleanedCategories).length !== Object.keys(categories).length) {
        setCategoriesState(cleanedCategories);
      }
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  const clearData = () => {
    localStorage.removeItem("monobankData");
    localStorage.removeItem("hasSeenOnboarding");
    localStorage.removeItem("onboarding-token");
    setTransactionsState([]);
    setCategoriesState({});
  };

  const loadSampleData = () => {
    setTransactionsState(transactionData.transactions);
    setCategoriesState({});
  };

  const importData = (data: AppData) => {
    // Clear all data first
    localStorage.removeItem("monobankData");
    
    // Import new data
    setTransactionsState(data.transactions);
    setCategoriesState(data.categories);
    
    // Save imported data (preserve any existing token/useRealData)
    const importedData: StoredData = {
      token: "",
      transactions: data.transactions,
      timestamp: Date.now(),
      useRealData: false,
      categories: data.categories,
    };
    
    localStorage.setItem("monobankData", JSON.stringify(importedData));
  };

  const exportData = (): AppData => {
    return {
      transactions,
      categories,
    };
  };

  const setTransactions = (newTransactions: Transaction[]) => {
    setTransactionsState(newTransactions);
  };

  const setCategories = (newCategories: { [key: string]: string }) => {
    setCategoriesState(newCategories);
  };

  // Auto-save when data changes (but not when data is cleared)
  useEffect(() => {
    // Only save if we have transactions AND they're not just the initial sample data after clearing
    if (transactions.length > 0) {
      saveData();
    }
  }, [transactions, categories]);

  return {
    transactions,
    categories,
    setTransactions,
    setCategories,
    saveData,
    clearData,
    loadSampleData,
    importData,
    exportData,
  };
};
