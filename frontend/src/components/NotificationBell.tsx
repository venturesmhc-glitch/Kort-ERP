import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { IconBell } from './icons/NavIcons';
import type { AppNotification } from '../modules/notifications/notifications.types';

interface NotificationBellProps {
  notifications: AppNotification[];
  unreadCount: number;
  onOpen: () => void;
}

const DATE_FORMAT = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export function NotificationBell({ notifications, unreadCount, onOpen }: NotificationBellProps) {
  const [open, setOpen] = useState(false);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      if (next) onOpen();
      return next;
    });
  }

  return (
    <div className="notification-bell-wrap">
      <button
        type="button"
        className="button-secondary notification-bell-trigger"
        onClick={toggle}
        aria-expanded={open}
        aria-label="Notificaciones"
      >
        <IconBell />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {open && (
        <>
          <div className="notification-panel-backdrop" onClick={() => setOpen(false)} />
          <div className="notification-panel" role="dialog" aria-label="Notificaciones">
            <div className="notification-panel-header">Notificaciones</div>
            {notifications.length === 0 ? (
              <p className="notification-panel-empty text-muted">No hay notificaciones por ahora.</p>
            ) : (
              <ul className="notification-panel-list">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <NavLink
                      to={notification.link}
                      className={`notification-item notification-item-${notification.prioridad}`}
                      onClick={() => setOpen(false)}
                    >
                      <span className="notification-item-message">{notification.mensaje}</span>
                      <span className="notification-item-date">
                        {DATE_FORMAT.format(new Date(notification.fecha))}
                      </span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
