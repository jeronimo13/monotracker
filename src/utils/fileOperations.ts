import type { AppExport } from "../types";

export const exportToFile = (data: AppExport, filename?: string): void => {
  const exportData = {
    version: "1.0",
    exportDate: new Date().toISOString(),
    metadata: {
      totalTransactions: data.transactions.length,
      dateRange: data.transactions.length > 0 ? {
        from: Math.min(...data.transactions.map(tx => tx.time)),
        to: Math.max(...data.transactions.map(tx => tx.time))
      } : { from: 0, to: 0 },
      categories: Object.keys(data.categories)
    },
    data
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `monobank-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const importFromFile = (): Promise<AppExport> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('Файл не обрано'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          
          // Simple validation
          if (!parsed.data) {
            reject(new Error('Невірний формат файлу: відсутні дані'));
            return;
          }

          const importData: AppExport = {
            transactions: parsed.data.transactions || [],
            categories: parsed.data.categories || {},
            rules: parsed.data.rules || []
          };

          // Basic validation
          if (!Array.isArray(importData.transactions)) {
            reject(new Error('Невірний формат файлу: транзакції мають бути масивом'));
            return;
          }

          if (typeof importData.categories !== 'object') {
            reject(new Error('Невірний формат файлу: категорії мають бути обʼєктом'));
            return;
          }

          resolve(importData);
        } catch (error) {
          reject(new Error('Не вдалося розібрати JSON-файл'));
        }
      };

      reader.onerror = () => reject(new Error('Не вдалося прочитати файл'));
      reader.readAsText(file);
    };

    input.click();
  });
};

export const validateImportData = (data: unknown): data is AppExport => {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const maybeData = data as Partial<AppExport>;

  if (!Array.isArray(maybeData.transactions)) {
    return false;
  }

  if (!maybeData.categories || typeof maybeData.categories !== 'object') {
    return false;
  }

  // Rules are optional for backward compatibility
  if (maybeData.rules && !Array.isArray(maybeData.rules)) {
    return false;
  }

  return true;
};
