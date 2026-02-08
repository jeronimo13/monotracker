import React, { useState } from "react";
import type { AppExport, Rule } from "../types";
import { exportToFile, importFromFile } from "../utils/fileOperations";

interface ImportExportButtonsProps {
  transactions: any[];
  categories: { [key: string]: string };
  rules: Rule[];
  onImport: (data: AppExport) => void;
}

export const ImportExportButtons: React.FC<ImportExportButtonsProps> = ({
  transactions,
  categories,
  rules,
  onImport,
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string>("");

  const handleExport = () => {
    const exportData: AppExport = {
      transactions,
      categories,
      rules,
    };
    
    exportToFile(exportData);
  };

  const handleImport = async () => {
    if (!confirm("Імпорт замінить усі поточні дані. Продовжити?")) {
      return;
    }

    setIsImporting(true);
    setImportError("");

    try {
      const importedData = await importFromFile();
      onImport(importedData);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Імпорт не вдався");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Імпорт / Експорт</h2>
        <p className="mt-1 text-sm text-gray-500">
          Збережіть або відновіть свої дані через JSON-файл.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleExport}
          className="settings-btn-primary"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          Експортувати
        </button>

        <button
          onClick={handleImport}
          disabled={isImporting}
          className="settings-btn-secondary"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
          {isImporting ? "Імпорт..." : "Імпортувати"}
        </button>
      </div>

      {importError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span className="mt-0.5 shrink-0">&#x26A0;</span>
          <span>{importError}</span>
        </div>
      )}

      <p className="text-xs text-gray-400">
        {transactions.length} транзакцій, {Object.keys(categories).length} категорій, {rules.length} правил
      </p>
    </div>
  );
};
