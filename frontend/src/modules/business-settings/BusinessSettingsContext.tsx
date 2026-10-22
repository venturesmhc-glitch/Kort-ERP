import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BusinessSettings } from '@kort/shared';
import { getBusinessSettingsRequest, getPublicBusinessSettingsRequest } from './business-settings.api';
import { DEFAULT_BUSINESS_SETTINGS } from './business-settings.constants';
import { getPublicTenantSlug, getToken } from '../../lib/apiClient';

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

  // Dos fuentes posibles (ver business-settings.api.ts): con sesion (panel
  // admin, sin slug en la URL) se resuelve el tenant por el JWT; sin sesion
  // pero con slug (landing/wizard/tienda publicos, ver PublicTenantGate en
  // router.tsx) se resuelve por el slug. Si no hay ni sesion ni slug todavia
  // (ej. primer render antes de que el router resuelva la ruta, o
  // /admin/login) no hay forma de saber el tenant: se deja el placeholder y
  // se espera a que algo dispare refresh() de nuevo con mas contexto (el
  // propio login, o PublicTenantGate al montar).
  const refresh = useCallback(async () => {
    const hasToken = Boolean(getToken());
    const slug = getPublicTenantSlug();
    if (!hasToken && !slug) {
      return;
    }

    setLoading(true);
    try {
      const data = hasToken ? await getBusinessSettingsRequest() : await getPublicBusinessSettingsRequest();
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
