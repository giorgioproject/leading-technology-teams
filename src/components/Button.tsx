import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Join class names, skipping empties. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).join(' ');
}

/** Visible keyboard ring used by buttons, links, and inputs. */
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-paper dark:focus-visible:ring-primary-bright dark:focus-visible:ring-offset-paper-dark';

const base = cn(
  'inline-flex items-center justify-center gap-2 font-medium no-underline transition-colors duration-200',
  'disabled:pointer-events-none disabled:opacity-50',
  focusRing,
);

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white shadow-sm hover:bg-primary-hover',
  secondary: cn(
    'border border-line bg-card text-ink shadow-sm hover:border-primary hover:bg-primary-soft',
    'dark:border-line-dark dark:bg-card-dark dark:text-ink-dark dark:hover:border-primary-bright dark:hover:bg-primary-soft-dark',
  ),
  ghost:
    'bg-transparent text-ink hover:bg-primary-soft dark:text-ink-dark dark:hover:bg-primary-soft-dark',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-9 rounded-xl px-3 text-sm',
  md: 'min-h-11 rounded-xl px-4 text-base',
};

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(base, variants[variant], sizes[size], className);
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClasses(variant, size, className)} {...props} />;
});
