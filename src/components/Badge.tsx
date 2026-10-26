import { AlertCircle, Check, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './Button';

/** Alignment of a charter term. The word and the icon carry the meaning, not the color alone. */
export type AlignmentStatus = 'aligned' | 'partly' | 'misaligned';

const styles: Record<AlignmentStatus, { label: string; icon: LucideIcon; className: string }> = {
  aligned: {
    label: 'Aligned',
    icon: Check,
    className: 'bg-good-soft text-good-ink dark:bg-good-soft-dark dark:text-good-bright',
  },
  partly: {
    label: 'Partly aligned',
    icon: Minus,
    className: 'bg-warn-soft text-warn-ink dark:bg-warn-soft-dark dark:text-warn-bright',
  },
  misaligned: {
    label: 'Misaligned',
    icon: AlertCircle,
    className: 'bg-alert-soft text-alert-ink dark:bg-alert-soft-dark dark:text-alert-bright',
  },
};

export function Badge({ status }: { status: AlignmentStatus }) {
  const item = styles[status];
  const Icon = item.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium',
        item.className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {item.label}
    </span>
  );
}
