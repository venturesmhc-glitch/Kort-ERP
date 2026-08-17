export function LoadingState() {
  return <p className="text-muted">Cargando...</p>;
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
