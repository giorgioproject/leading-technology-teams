import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { buttonClasses, cn } from './Button';

interface PageScaffoldProps {
  title: string;
  description: string;
  eyebrow?: string;
  /** Overrides the browser tab title. Defaults to "{title} · CommonGround". */
  documentTitle?: string;
  children?: ReactNode;
}

/** Page title, a short instruction, and whatever the page still needs to show. */
export function PageScaffold({ title, description, eyebrow, documentTitle, children }: PageScaffoldProps) {
  useEffect(() => {
    document.title = documentTitle ?? `${title} · CommonGround`;
  }, [documentTitle, title]);

  return (
    <div className="space-y-6">
      <header className="max-w-2xl space-y-3">
        {eyebrow ? <p className="label">{eyebrow}</p> : null}
        <h1>{title}</h1>
        <p className="text-base leading-[1.6] text-muted dark:text-muted-dark">{description}</p>
      </header>
      {children}
    </div>
  );
}

interface StepTarget {
  to: string;
  label: string;
}

/** Back and next links for the workflow shell. Real forms replace these later. */
export function StepLinks({ back, next }: { back?: StepTarget; next?: StepTarget }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {back ? (
        <Link to={back.to} className={cn(buttonClasses('ghost'), 'mr-auto')}>
          {back.label}
        </Link>
      ) : null}
      {next ? (
        <Link to={next.to} className={buttonClasses('primary')}>
          {next.label}
        </Link>
      ) : null}
    </div>
  );
}
