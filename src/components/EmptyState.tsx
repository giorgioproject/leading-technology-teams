import type { LucideIcon } from 'lucide-react';

/** Shown when a page has nothing to display yet. One sentence, plus an icon. */
export function EmptyState({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-card px-6 py-12 text-center dark:border-line-dark dark:bg-card-dark">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary dark:bg-primary-soft-dark dark:text-primary-bright">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="max-w-md text-base leading-[1.6] text-muted dark:text-muted-dark">{message}</p>
    </div>
  );
}
