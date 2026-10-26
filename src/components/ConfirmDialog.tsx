import { useEffect, useRef } from 'react';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A small confirmation. Escape, the backdrop, and "Keep data" all cancel. */
export function ConfirmDialog({ open, title, body, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea')].filter(
        (element) => !element.hasAttribute('disabled'),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center dark:bg-black/60"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-body"
        className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-sm dark:border-line-dark dark:bg-card-dark"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-[1.75rem]">
          {title}
        </h2>
        <p id="confirm-body" className="mt-2 text-muted dark:text-muted-dark">
          {body}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel}>
            Keep data
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
