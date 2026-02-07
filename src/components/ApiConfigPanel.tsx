import React, { useState, useEffect } from "react";

interface ApiConfigPanelProps {
  onTokenUpdate: (newTransactions: any[]) => void;
}

export const ApiConfigPanel: React.FC<ApiConfigPanelProps> = ({ onTokenUpdate }) => {
  const [token, setToken] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [showApiBlock, setShowApiBlock] = useState<boolean>(false);
  const [useRealData, setUseRealData] = useState<boolean>(false);

  // Load token from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("monobankData");
      if (stored) {
        const data = JSON.parse(stored);
        setToken(data.token || "");
        setUseRealData(data.useRealData || false);
      }
    } catch (error) {
      console.error("Error loading token:", error);
    }
  }, []);


  const updateStoredToken = (newToken: string, newUseRealData: boolean) => {
    try {
      const stored = localStorage.getItem("monobankData");
      if (stored) {
        const data = JSON.parse(stored);
        data.token = newToken;
        data.useRealData = newUseRealData;
        data.timestamp = Date.now();
        localStorage.setItem("monobankData", JSON.stringify(data));
      } else {
        // Create new entry if none exists
        const data = {
          token: newToken,
          transactions: [],
          timestamp: Date.now(),
          useRealData: newUseRealData,
          categories: {},
        };
        localStorage.setItem("monobankData", JSON.stringify(data));
      }
    } catch (error) {
      console.error("Error updating stored token:", error);
    }
  };

  const fetchMonobankTransactions = async () => {
    if (!token.trim()) {
      setError("Будь ласка, введіть дійсний токен");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const now = Math.floor(Date.now() / 1000);
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

      const response = await fetch(
        `https://api.monobank.ua/personal/statement/0/${thirtyDaysAgo}/${now}`,
        {
          headers: {
            "X-Token": token,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Недійсний токен. Будь ласка, перевірте ваш токен та спробуйте ще раз.");
        } else if (response.status === 429) {
          throw new Error("Перевищено ліміт запитів. Будь ласка, спробуйте пізніше.");
        } else {
          throw new Error(`Помилка API: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        const sortedApiData = data.sort((a, b) => b.time - a.time);
        
        const transformedTransactions = sortedApiData.map((tx, index) => ({
          id: `${tx.time}_${index}`,
          time: tx.time,
          description: tx.description || "Невідомо",
          mcc: tx.mcc || 0,
          originalMcc: tx.originalMcc || tx.mcc || 0,
          hold: tx.hold || false,
          amount: tx.amount || 0,
          operationAmount: tx.operationAmount || tx.amount || 0,
          currencyCode: tx.currencyCode || 980,
          commissionRate: tx.commissionRate || 0,
          cashbackAmount: tx.cashbackAmount || 0,
          balance: tx.balance || 0,
          comment: tx.comment || "",
          receiptId: tx.receiptId || "",
          invoiceId: tx.invoiceId || "",
          counterEdrpou: tx.counterEdrpou || "",
          counterIban: tx.counterIban || "",
          category: undefined,
        }));

        setUseRealData(true);
        updateStoredToken(token, true);
        onTokenUpdate(transformedTransactions);

        setSuccessMessage(`Завантажено ${transformedTransactions.length} транзакцій`);
      } else {
        throw new Error("Неправильний формат відповіді від API");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося отримати транзакції");
      setUseRealData(false);
      updateStoredToken(token, false);
    } finally {
      setIsLoading(false);
    }
  };

  const switchToSampleData = () => {
    setUseRealData(false);
    setToken("");
    setError("");
    setSuccessMessage("");
    updateStoredToken("", false);
    onTokenUpdate([-1]); // Special signal to load sample data
  };

  const clearStoredData = () => {
    localStorage.removeItem("monobankData");
    localStorage.removeItem("hasSeenOnboarding");
    localStorage.removeItem("onboarding-token");
    setToken("");
    setError("");
    setSuccessMessage("");
    onTokenUpdate([]); // Signal to clear all data
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      {/* Toggle API Block Button */}
      <div className="mb-4">
        <button
          onClick={() => setShowApiBlock(!showApiBlock)}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm"
        >
          {showApiBlock ? "Сховати" : "Показати"} налаштування API
        </button>
      </div>

      {/* Token Input Section */}
      {showApiBlock && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            Отримати реальні дані з API Monobank
          </h2>
          <div className="space-y-3">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Введіть ваш токен Monobank"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={fetchMonobankTransactions}
                disabled={isLoading}
                className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Завантаження..." : "Оновити останні 30 днів"}
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={switchToSampleData}
                className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Використати демо-дані
              </button>
              <button
                onClick={clearStoredData}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                title="Очистити збережені дані та токен"
              >
                Очистити
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mt-3 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
              {successMessage}
            </div>
          )}

          {useRealData && (
            <div className="mt-3 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              ✓ Використовуються реальні дані з API Monobank
              <br />
              <span className="text-sm">
                Дані будуть автоматично оновлені при перезавантаженні сторінки
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
