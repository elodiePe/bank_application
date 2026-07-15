import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout.js';
import { DashboardRouter } from './pages/DashboardRouter.js';
import { TimelinePage } from './pages/TimelinePage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { StockPortfolioPage } from './pages/StockPortfolioPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { LandingPage } from './pages/LandingPage.js';
import { RegisterFamilyPage } from './pages/RegisterFamilyPage.js';
import { FamilyLoginPage } from './pages/FamilyLoginPage.js';
import { VerifyEmailPage } from './pages/VerifyEmailPage.js';
import { DeleteFamilyPage } from './pages/DeleteFamilyPage.js';
import { ForgotFamilyPasswordPage } from './pages/ForgotFamilyPasswordPage.js';
import { ResetPasswordPage } from './pages/ResetPasswordPage.js';
import { RequireAuth } from './components/RequireAuth.js';
import { RequireFamilyOwner } from './components/RequireFamilyOwner.js';

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterFamilyPage />} />
        <Route path="/family-login" element={<FamilyLoginPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/delete-family" element={<DeleteFamilyPage />} />
        <Route path="/forgot-password" element={<ForgotFamilyPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/login"
          element={
            <RequireFamilyOwner>
              <LoginPage />
            </RequireFamilyOwner>
          }
        />
        <Route
          element={
            <RequireAuth>
              <RootLayout />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<DashboardRouter />} />
          <Route path="/history" element={<TimelinePage />} />
          <Route path="/portfolio" element={<StockPortfolioPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
