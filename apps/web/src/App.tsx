import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout.js';
import { DashboardPlaceholderPage } from './pages/DashboardPlaceholderPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RequireAuth } from './components/RequireAuth.js';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <RootLayout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPlaceholderPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
