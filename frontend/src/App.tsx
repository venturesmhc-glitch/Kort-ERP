import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastProvider } from './components/toast/ToastProvider';
import { AuthProvider } from './modules/auth/AuthContext';
import { router } from './router';

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
