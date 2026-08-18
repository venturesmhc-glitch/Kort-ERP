import { useCallback, useEffect, useState } from 'react';
import { listNotificationsRequest } from './notifications.api';
import type { AppNotification } from './notifications.types';

// Alcanza con polling (no WebSockets) para el volumen de turnos/alertas de
// stock de una barberia. 45s balancea "se entera rapido" con no golpear el
// backend (Render free) de mas.
const POLL_INTERVAL_MS = 45_000;

function lastSeenKey(userId: string) {
  return `kort-notifications-last-seen-${userId}`;
}

// El estado de leido/no leido se resuelve 100% en el frontend (no hay tabla
// de notificaciones en el backend, ver notifications.service.ts): se guarda
// el timestamp de la ultima vez que el usuario abrio el panel, y todo lo
// posterior a eso cuenta como no leido.
function getLastSeen(userId: string): number {
  const raw = localStorage.getItem(lastSeenKey(userId));
  return raw ? Number(raw) : 0;
}

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [lastSeen, setLastSeen] = useState(() => (userId ? getLastSeen(userId) : 0));

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await listNotificationsRequest();
      setNotifications(data);
    } catch {
      // Silencioso: un polling fallido no debe romper el layout ni tirar toasts.
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }
    setLastSeen(getLastSeen(userId));
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [userId, refresh]);

  const unreadCount = notifications.filter(
    (notification) => new Date(notification.fecha).getTime() > lastSeen
  ).length;

  function markAllRead() {
    if (!userId) return;
    const now = Date.now();
    localStorage.setItem(lastSeenKey(userId), String(now));
    setLastSeen(now);
  }

  return { notifications, unreadCount, markAllRead, refresh };
}
