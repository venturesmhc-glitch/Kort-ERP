import { apiRequest } from '../../lib/apiClient';
import type { GrowthSettings } from './growth.types';

export function getGrowthSettingsRequest(): Promise<GrowthSettings> {
  return apiRequest<GrowthSettings>('/growth-settings');
}

export function updateGrowthSettingsRequest(input: GrowthSettings): Promise<GrowthSettings> {
  return apiRequest<GrowthSettings>('/growth-settings', { method: 'PUT', body: input });
}
