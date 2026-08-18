export type NotificationType = 'turno_nuevo' | 'stock_bajo';
export type NotificationPriority = 'alta' | 'media' | 'normal';

export interface AppNotification {
  id: string;
  tipo: NotificationType;
  mensaje: string;
  fecha: string;
  link: string;
  prioridad: NotificationPriority;
}
