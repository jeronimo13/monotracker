import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import OnboardingPage from "./pages/OnboardingPage";
import SetupPage from "./pages/SetupPage";
import DashboardPage from "./pages/DashboardPage";
import { DateRangeProvider } from "./contexts/DateRangeContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import ThemeToggle from "./components/ThemeToggle";

function App() {
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const basename = import.meta.env.BASE_URL;

  useEffect(() => {
    // Check if user has seen onboarding before
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
    const hasStoredData = localStorage.getItem("monobankData");
    
    // Show onboarding if:
    // 1. User hasn't seen it before AND
    // 2. No stored data exists (first time user)
    if (!hasSeenOnboarding && !hasStoredData) {
      setShowOnboarding(true);
    }
  }, []);



  return (
    <ThemeProvider>
      <ThemeToggle />
      <DateRangeProvider>
        <Router basename={basename}>
          {showOnboarding ? (
            <Routes>
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="*" element={<Navigate to="/onboarding" replace />} />
            </Routes>
          ) : (
            <Routes>
              <Route 
                path="/onboarding" 
                element={<OnboardingPage />} 
              />
              <Route 
                path="/setup" 
                element={<SetupPage />} 
              />
              <Route 
                path="/dashboard" 
                element={<DashboardPage />} 
              />
              <Route 
                path="/" 
                element={<Navigate to="/dashboard" replace />} 
              />
              <Route 
                path="*" 
                element={<Navigate to="/dashboard" replace />} 
              />
            </Routes>
          )}
        </Router>
      </DateRangeProvider>
    </ThemeProvider>
  );
}

export default App;
