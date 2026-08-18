import { useEffect } from 'react';
import { useBusinessSettings } from '../modules/business-settings/BusinessSettingsContext';

// Aplica los colores de marca del tenant sobre las variables CSS globales,
// por encima de la paleta claro/oscuro base. Se llama solo en las paginas
// publicas para no alterar la identidad visual del panel administrativo.
export function useBusinessTheme() {
  const { settings } = useBusinessSettings();
  const { primary, secondary, accent } = settings.theme;

  useEffect(() => {
    const root = document.documentElement;
    if (primary) root.style.setProperty('--color-primary', primary);
    if (secondary) root.style.setProperty('--color-secondary', secondary);
    if (accent) root.style.setProperty('--color-accent', accent);

    return () => {
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--color-secondary');
      root.style.removeProperty('--color-accent');
    };
  }, [primary, secondary, accent]);
}
