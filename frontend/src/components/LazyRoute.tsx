import { Suspense, type ReactNode } from 'react';
import { PageSkeleton } from './AsyncState';

export function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}
