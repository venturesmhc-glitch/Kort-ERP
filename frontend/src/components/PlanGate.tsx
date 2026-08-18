import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { usePlan } from '../modules/plan/PlanContext';
import { useAuth } from '../modules/auth/AuthContext';
import { LoadingState } from './AsyncState';

interface PlanGateProps {
  children: ReactNode;
  feature?: string;
}

// Envuelve el contenido de las pestanas exclusivas del Plan Integral
// (Proveedores, Ordenes de compra, Reportes). La ruta en si es visible para
// cualquier rol logueado (ver router.tsx) - lo que cambia con el plan es el
// contenido: con Basico se muestra este upsell en vez del modulo real. El
// backend igual rechaza (403) cualquier llamado directo a estos endpoints
// si el plan no alcanza (ver requirePlan.ts), este gate es solo de UI.
export function PlanGate({ children, feature = 'Esta funcionalidad' }: PlanGateProps) {
  const { isIntegral, loading } = usePlan();
  const { user } = useAuth();

  if (loading) {
    return <LoadingState />;
  }

  if (isIntegral) {
    return <>{children}</>;
  }

  return (
    <div className="card plan-upsell">
      <h2>Actualiza tu Plan Integral</h2>
      <p className="text-muted">
        {feature} es parte del Plan Integral. Actualiza tu plan para desbloquear proveedores,
        ordenes de compra automaticas y reportes/exportacion.
      </p>
      {user?.role === 'DEV' && (
        <Link to="/admin/plan" className="button-link">
          Ir a configuracion del plan
        </Link>
      )}
    </div>
  );
}
