import { useEffect, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { setPublicTenantSlug } from '../lib/apiClient';
import { useBusinessSettings } from '../modules/business-settings/BusinessSettingsContext';

// Envuelve todo el arbol publico (landing, tienda, contacto, wizard de
// turnos - ver router.tsx, montados bajo /t/:slug). Fija el slug activo en
// apiClient de forma SINCRONICA durante el render (no en un efecto): asi
// cualquier fetch que dispare un componente hijo, incluso en su propio
// primer render, ya lo encuentra seteado. El refresh de BusinessSettings si
// es un efecto propio (dispara un fetch real) - ver BusinessSettingsContext.
export function PublicTenantGate({ children }: { children: ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  setPublicTenantSlug(slug ?? null);

  const { refresh } = useBusinessSettings();
  useEffect(() => {
    refresh();
    // Vuelve a null al desmontar (navegacion fuera de /t/:slug) para que un
    // fetch publico perdido despues no reuse el slug de la barberia anterior.
    return () => setPublicTenantSlug(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (!slug) {
    return null;
  }

  return <>{children}</>;
}
