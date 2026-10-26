import type { ReactNode } from 'react';
import { cn, focusRing } from './Button';

const controlClass = cn(
  'mt-1.5 w-full rounded-xl border border-line bg-card px-3 py-2.5 text-base text-ink shadow-sm',
  'placeholder:text-muted dark:border-line-dark dark:bg-card-dark dark:text-ink-dark dark:placeholder:text-muted-dark',
  focusRing,
);

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  error?: string;
  hint?: ReactNode;
  placeholder?: string;
  autoComplete?: string;
  /** When set, the control is a textarea instead of a single-line input. */
  rows?: number;
}

/** A labeled text control. The error is tied to the field with aria-describedby. */
export function TextField({
  id,
  label,
  value,
  onChange,
  optional = false,
  error,
  hint,
  placeholder,
  autoComplete = 'off',
  rows,
}: TextFieldProps) {
  const describedBy = [error ? `${id}-error` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ');
  const shared = {
    id,
    value,
    placeholder,
    autoComplete,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
  };

  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-ink dark:text-ink-dark">
        {label}
        {optional ? (
          <span className="ml-2 font-normal text-muted dark:text-muted-dark">Optional</span>
        ) : null}
      </label>
      {rows ? (
        <textarea {...shared} rows={rows} className={cn(controlClass, 'min-h-48 resize-y leading-relaxed')} />
      ) : (
        <input {...shared} type="text" className={cn(controlClass, 'min-h-11')} />
      )}
      {hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted dark:text-muted-dark">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-alert-ink dark:text-alert-bright">
          {error}
        </p>
      ) : null}
    </div>
  );
}
