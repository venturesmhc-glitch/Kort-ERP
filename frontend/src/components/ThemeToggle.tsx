import { useTheme } from '../theme/ThemeProvider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button type="button" onClick={toggleTheme} className="theme-toggle">
      {theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
    </button>
  );
}
