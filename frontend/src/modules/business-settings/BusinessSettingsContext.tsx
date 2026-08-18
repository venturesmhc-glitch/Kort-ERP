import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BusinessSettings } from '@kort/shared';
import { getBusinessSettingsRequest } from './business-settings.api';
import { DEFAULT_BUSINESS_SETTINGS } from './business-settings.constants';

interface BusinessSettingsContextValue {
  settings: BusinessSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const BusinessSettingsContext = createContext<BusinessSettingsContextValue | undefined>(undefined);

// A diferencia de PlanContext, esto se carga siempre (no depende de sesion):
// la landing publica (sin usuario logueado) tambien necesita nombre, contacto
// y tema del tenant. Reemplaza el import estatico de business.config.ts que
// rompia multi-tenant (cada instalacion requeria editar codigo y redeployar).
export function BusinessSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_BUSINESS_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBusinessSettingsRequest();
      setSettings(data);
    } catch {
      // Si falla el fetch (backend caido, etc.) se mantiene el placeholder
      // en vez de romper la landing.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<BusinessSettingsContextValue>(
    () => ({ settings, loading, refresh }),
    [settings, loading, refresh]
  );

  return <BusinessSettingsContext.Provider value={value}>{children}</BusinessSettingsContext.Provider>;
}

export function useBusinessSettings() {
  const context = useContext(BusinessSettingsContext);
  if (!context) {
    throw new Error('useBusinessSettings debe usarse dentro de un BusinessSettingsProvider');
  }
  return context;
}
