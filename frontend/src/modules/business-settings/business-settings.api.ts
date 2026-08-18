import type { BusinessSettings } from '@kort/shared';
import { apiRequest } from '../../lib/apiClient';

// GET es publico (sin auth) porque la landing lo consume sin sesion; el
// panel de administracion tambien lo usa para precargar el form de edicion.
export function getBusinessSettingsRequest() {
  return apiRequest<BusinessSettings>('/public/business-settings', { auth: false });
}

export function updateBusinessSettingsRequest(input: BusinessSettings) {
  return apiRequest<BusinessSettings>('/business-settings', { method: 'PUT', body: input });
}
