import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getSettingsRequest } from './plan.api';
import type { Plan } from './plan.types';

interface PlanContextValue {
  plan: Plan | null;
  isIntegral: boolean;
  loading: boolean;
  refreshPlan: () => Promise<void>;
}

const PlanContext = createContext<PlanContextValue | undefined>(undefined);

// Separado de AuthContext porque el plan no viaja en el JWT/usuario: vive en
// una fila de configuracion de la instalacion (ver settings.service.ts en el
// backend) y puede cambiar sin que el usuario tenga que volver a loguearse.
export function PlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshPlan = useCallback(async () => {
    if (!user) {
      setPlan(null);
      return;
    }
    setLoading(true);
    try {
      const settings = await getSettingsRequest();
      setPlan(settings.plan);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshPlan();
  }, [refreshPlan]);

  const value = useMemo<PlanContextValue>(
    () => ({ plan, isIntegral: plan === 'INTEGRAL', loading, refreshPlan }),
    [plan, loading, refreshPlan]
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan debe usarse dentro de un PlanProvider');
  }
  return context;
}
