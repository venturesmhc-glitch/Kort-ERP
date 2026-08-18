import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastProvider } from './components/toast/ToastProvider';
import { AuthProvider } from './modules/auth/AuthContext';
import { PlanProvider } from './modules/plan/PlanContext';
import { BusinessSettingsProvider } from './modules/business-settings/BusinessSettingsContext';
import { router } from './router';

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BusinessSettingsProvider>
          <AuthProvider>
            <PlanProvider>
              <RouterProvider router={router} />
            </PlanProvider>
          </AuthProvider>
        </BusinessSettingsProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
