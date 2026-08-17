import type { ApiFieldIssue } from './apiClient';

// Mismo shape que un issue de Zod (path + message) y que ApiFieldIssue del backend,
// asi los forms pueden usar tanto `parsed.error.issues` (validacion local) como
// `err.issues` (validacion del servidor) de forma intercambiable.
export type FieldIssue = ApiFieldIssue;

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function getFieldError(issues: FieldIssue[] | undefined, fieldName: string): string | undefined {
  return issues?.find((issue) => issue.path[0] === fieldName)?.message;
}
