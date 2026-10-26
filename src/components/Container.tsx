import type { ReactNode } from 'react';
import { cn } from './Button';

/** Centers page content at 1100px, with 16px of side padding on a phone and 24px above that. */
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-content px-4 sm:px-6', className)}>{children}</div>;
}
