import { apiRequest } from '../../lib/apiClient';
import type { AppNotification } from './notifications.types';

export function listNotificationsRequest() {
  return apiRequest<AppNotification[]>('/notifications');
}
