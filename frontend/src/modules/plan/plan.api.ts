import { apiRequest } from '../../lib/apiClient';
import type { OrganizationSettings, Plan } from './plan.types';

export function getSettingsRequest() {
  return apiRequest<OrganizationSettings>('/settings');
}

export function updateSettingsRequest(plan: Plan) {
  return apiRequest<OrganizationSettings>('/settings', { method: 'PUT', body: { plan } });
}
