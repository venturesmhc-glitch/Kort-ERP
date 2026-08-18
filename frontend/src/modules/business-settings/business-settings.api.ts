import type { BusinessSettings } from '@kort/shared';
import { apiRequest, apiUpload } from '../../lib/apiClient';

export type BusinessImageField = 'logo' | 'header' | 'footer';

// GET es publico (sin auth) porque la landing lo consume sin sesion; el
// panel de administracion tambien lo usa para precargar el form de edicion.
export function getBusinessSettingsRequest() {
  return apiRequest<BusinessSettings>('/public/business-settings', { auth: false });
}

export function updateBusinessSettingsRequest(input: BusinessSettings) {
  return apiRequest<BusinessSettings>('/business-settings', { method: 'PUT', body: input });
}

export function uploadBusinessImageRequest(field: BusinessImageField, file: File) {
  const formData = new FormData();
  formData.append('image', file);
  return apiUpload<BusinessSettings>(`/business-settings/image/${field}`, formData);
}
