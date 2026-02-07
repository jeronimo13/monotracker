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
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">Імпорт/експорт даних</h3>
      
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          Експортувати все
        </button>
        
        <button
          onClick={handleImport}
          disabled={isImporting}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isImporting ? "Імпорт..." : "Імпортувати дані"}
        </button>
      </div>

      {importError && (
        <div className="p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {importError}
        </div>
      )}

      <div className="text-xs text-gray-500">
        <p>• Експорт зберігає всі транзакції, категорії та правила у JSON-файл</p>
        <p>• Імпорт замінює поточні дані вмістом обраного файлу</p>
        <p>• Дані містять {transactions.length} транзакцій і {Object.keys(categories).length} категорій</p>
      </div>
    </div>
  );
};
