import type { ReactNode } from 'react';

export type StatusTone = 'success' | 'warning' | 'danger' | 'muted';

interface StatusBadgeProps {
  tone: StatusTone;
  children: ReactNode;
}

export function StatusBadge({ tone, children }: StatusBadgeProps) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
