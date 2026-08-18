import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastProvider } from './components/toast/ToastProvider';
import { AuthProvider } from './modules/auth/AuthContext';
import { PlanProvider } from './modules/plan/PlanContext';
import { router } from './router';

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <PlanProvider>
            <RouterProvider router={router} />
          </PlanProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
