import type { ReactNode } from 'react';
import { BookOpen, Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './Button';

type CalloutTone = 'how' | 'why';

interface CalloutProps {
  tone: CalloutTone;
  /** Replaces the default heading when a page needs a more specific label. */
  title?: string;
  children: ReactNode;
}

const tones: Record<CalloutTone, { icon: LucideIcon; title: string; box: string; iconClass: string }> = {
  how: {
    icon: Info,
    title: 'How to do this step',
    box: 'border-primary/20 bg-primary-soft text-ink dark:border-primary-bright/25 dark:bg-primary-soft-dark dark:text-ink-dark',
    iconClass: 'text-primary dark:text-primary-bright',
  },
  why: {
    icon: BookOpen,
    title: 'Why this matters',
    box: 'border-accent/30 bg-accent-soft text-ink dark:border-accent/40 dark:bg-accent-soft-dark dark:text-ink-dark',
    iconClass: 'text-accent-ink dark:text-accent-bright',
  },
};

/** Short guidance: green for instructions, amber for the course idea behind a step. */
export function Callout({ tone, title, children }: CalloutProps) {
  const config = tones[tone];
  const Icon = config.icon;

  return (
    <aside className={cn('flex gap-3 rounded-2xl border p-4', config.box)}>
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', config.iconClass)} aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold">{title ?? config.title}</p>
        <div className="mt-1 text-sm leading-relaxed">{children}</div>
      </div>
    </aside>
  );
}
