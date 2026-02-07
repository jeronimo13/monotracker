import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SetupPage: React.FC = () => {
  const [token, setToken] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [validationError, setValidationError] = useState("");
  const navigate = useNavigate();

  // Validate token when it changes
  useEffect(() => {
    if (!token.trim()) {
      setValidationStatus("idle");
      setValidationError("");
      return;
    }

    const validateToken = async () => {
      setIsValidating(true);
      setValidationError("");

      try {
        const response = await fetch("https://api.monobank.ua/personal/client-info", {
          headers: {
            "X-Token": token,
          },
        });

        if (response.ok) {
          await response.json();
          setValidationStatus("valid");
          setValidationError("");
        } else if (response.status === 401) {
          setValidationStatus("invalid");
          setValidationError("Недійсний токен. Перевірте токен і спробуйте ще раз.");
        } else if (response.status === 429) {
          setValidationStatus("invalid");
          setValidationError("Забагато запитів. Зачекайте трохи та спробуйте ще раз.");
        } else {
          setValidationStatus("invalid");
          setValidationError(`Помилка API: ${response.status}`);
        }
      } catch {
        setValidationStatus("invalid");
        setValidationError("Помилка мережі. Перевірте зʼєднання та спробуйте ще раз.");
      } finally {
        setIsValidating(false);
      }
    };

    // Debounce validation - wait 500ms after user stops typing
    const timeoutId = setTimeout(validateToken, 500);
    return () => clearTimeout(timeoutId);
  }, [token]);

  const handleContinue = () => {
    // Save token if provided
    if (token.trim()) {
      localStorage.setItem("onboarding-token", token);
    }
    localStorage.setItem("hasSeenOnboarding", "true");
    navigate("/dashboard");
  };

  const skipSetup = () => {
    localStorage.setItem("hasSeenOnboarding", "true");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full">
        <div className="text-center">
          <div className="text-6xl mb-6">🏦</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Підключити Monobank API
          </h1>
          <p className="text-gray-600 mb-6">
            Підключіть свій Monobank акаунт для роботи з реальними транзакціями або використовуйте демо-дані для ознайомлення
          </p>
          
          {/* Steps */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-medium text-blue-900 mb-3">📋 Як підключити:</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex items-start space-x-2">
                <span className="font-medium">1️⃣</span>
                <div>
                  Отримайте персональний токен на{" "}
                  <a 
                    href="https://api.monobank.ua/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-600"
                  >
                    api.monobank.ua
                  </a>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-medium">2️⃣</span>
                <span>Введіть токен у поле нижче</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4 mb-8">
            <div className="relative">
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Вставте ваш персональний токен..."
                className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-500 ${
                  validationStatus === "valid" 
                    ? "border-green-500 focus:ring-green-500 focus:border-transparent" 
                    : validationStatus === "invalid" 
                    ? "border-red-500 focus:ring-red-500 focus:border-transparent"
                    : "border-gray-300 focus:ring-blue-500 focus:border-transparent"
                }`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && validationStatus !== "invalid") {
                    handleContinue();
                  }
                }}
              />
              
              {/* Validation indicator */}
              {token && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {isValidating && (
                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  )}
                  {!isValidating && validationStatus === "valid" && (
                    <div className="text-green-500 text-xl">✓</div>
                  )}
                  {!isValidating && validationStatus === "invalid" && (
                    <div className="text-red-500 text-xl">✗</div>
                  )}
                </div>
              )}
            </div>

            {/* Validation error message */}
            {validationError && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                {validationError}
              </div>
            )}

            {/* Success message */}
            {validationStatus === "valid" && (
              <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded text-sm">
                ✅ Токен підтверджено! Тепер ви можете працювати з реальними транзакціями
              </div>
            )}
            
            <div className="text-sm text-gray-500 text-center">
              <p>🔒 Ваш токен зберігається локально і ніколи не передається третім особам</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={handleContinue}
              disabled={isValidating || validationStatus === "invalid"}
              className={`w-full px-8 py-3 rounded-md font-medium focus:outline-none focus:ring-2 ${
                isValidating || validationStatus === "invalid"
                  ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
              }`}
            >
              {isValidating ? "Перевіряємо токен..." : "Продовжити"}
            </button>
            
            <button
              onClick={skipSetup}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Використати демо-дані
            </button>
          </div>

          {/* Back to onboarding link */}
          <div className="mt-6">
            <button
              onClick={() => navigate("/onboarding")}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              ← Повернутись до огляду функцій
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupPage;
