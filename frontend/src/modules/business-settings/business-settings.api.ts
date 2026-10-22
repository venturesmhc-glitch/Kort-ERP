import type { BusinessSettings } from '@kort/shared';
import { apiRequest, apiUpload } from '../../lib/apiClient';

export type BusinessImageField = 'logo' | 'header' | 'footer';

// Dos variantes segun quien pregunta (ver BusinessSettingsContext.tsx):
// la landing/wizard publico (sin sesion) resuelve el tenant por el slug de
// la URL via /public/business-settings; el panel admin (con sesion, sin
// slug) usa la ruta autenticada, que resuelve el tenant por el JWT.
export function getPublicBusinessSettingsRequest() {
  return apiRequest<BusinessSettings>('/public/business-settings', { auth: false });
}

export function getBusinessSettingsRequest() {
  return apiRequest<BusinessSettings>('/business-settings');
}

export function updateBusinessSettingsRequest(input: BusinessSettings) {
  return apiRequest<BusinessSettings>('/business-settings', { method: 'PUT', body: input });
}

export function uploadBusinessImageRequest(field: BusinessImageField, file: File) {
  const formData = new FormData();
  formData.append('image', file);
  return apiUpload<BusinessSettings>(`/business-settings/image/${field}`, formData);
}
