import type { CSSProperties } from 'react';

export function LoadingState() {
  return <p className="text-muted">Cargando...</p>;
}

export function Skeleton({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <div className={`skeleton ${className}`.trim()} style={style} />;
}

export function PageSkeleton() {
  return (
    <div>
      <Skeleton style={{ height: 60, marginBottom: 9 }} />
      <Skeleton style={{ height: 60, marginBottom: 9 }} />
      <Skeleton style={{ height: 60 }} />
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return <p className="form-error">{message}</p>;
}

export function EmptyState({ message }: { message: string }) {
  return <p className="text-muted">{message}</p>;
}

export function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
