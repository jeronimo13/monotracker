import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const OnboardingPage: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  // Clear all data when entering onboarding
  useEffect(() => {
    localStorage.removeItem("monobankData");
    localStorage.removeItem("hasSeenOnboarding");
    localStorage.removeItem("onboarding-token");
  }, []);

  const slides = [
    {
      title: "Ласкаво просимо до менеджера транзакцій Monobank",
      content: "Керуйте та аналізуйте транзакції Monobank за допомогою розширеної фільтрації, категоризації та аналітики.",
      icon: "💳"
    },
    {
      title: "Розумна фільтрація та пошук",
      content: "Фільтруйте за описом, MCC-кодами, категоріями, діапазонами дат та іншими параметрами. Використовуйте фасетну навігацію для швидкого відбору.",
      icon: "🔍"
    },
    {
      title: "Правила автокатегоризації",
      content: "Створюйте правила на основі фільтрів, щоб автоматично категоризувати схожі транзакції надалі.",
      icon: "🤖"
    },
    {
      title: "Імпорт та експорт",
      content: "Створюйте резервні копії у JSON. Імпортуйте та експортуйте транзакції, категорії й правила будь-коли.",
      icon: "💾"
    },
    {
      title: "Інтеграція з API в реальному часі",
      content: "Підключайте API Monobank персональним токеном, щоб безпечно отримувати реальні транзакції.",
      icon: "🔗"
    }
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      // From last slide, go to setup page
      navigate("/setup");
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const skipOnboarding = () => {
    localStorage.setItem("hasSeenOnboarding", "true");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4 transition-colors">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl p-8 max-w-2xl w-full">
        {/* Feature slides */}
        <div className="text-center">
            <div className="text-6xl mb-6">{slides[currentSlide].icon}</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">
              {slides[currentSlide].title}
            </h1>
            <p className="text-gray-600 dark:text-slate-300 mb-8 text-lg leading-relaxed">
              {slides[currentSlide].content}
            </p>
            
            {/* Progress dots */}
            <div className="flex justify-center space-x-2 mb-8">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentSlide ? "bg-blue-600" : "bg-gray-300 dark:bg-slate-600"
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <button
                onClick={skipOnboarding}
                className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Пропустити
              </button>
              
              <div className="space-x-4">
                <button
                  onClick={prevSlide}
                  disabled={currentSlide === 0}
                  className="px-4 py-2 text-gray-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Назад
                </button>
                <button
                  onClick={nextSlide}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {currentSlide === slides.length - 1 ? "Продовжити" : "Далі"}
                </button>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
