import type { HTMLAttributes } from 'react';
import { cn } from './Button';

/** White surface with a quiet border. Padding is 24px. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-card p-6 shadow-sm dark:border-line-dark dark:bg-card-dark',
        className,
      )}
      {...props}
    />
  );
}
