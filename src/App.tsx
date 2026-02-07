import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import OnboardingPage from "./pages/OnboardingPage";
import SetupPage from "./pages/SetupPage";
import DashboardPage from "./pages/DashboardPage";
import { DateRangeProvider } from "./contexts/DateRangeContext";

function App() {
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

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



  // If we need to show onboarding, redirect there
  if (showOnboarding) {
    return (
      <DateRangeProvider>
        <Router>
          <Routes>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          </Routes>
        </Router>
      </DateRangeProvider>
    );
  }

  return (
    <DateRangeProvider>
      <Router>
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
      </Router>
    </DateRangeProvider>
  );
}

export default App;