import { Link, useLocation } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useTeam } from '../context/TeamContext';
import { WORKFLOW_STEPS } from '../lib/types';
import { cn, focusRing } from './Button';

/**
 * Horizontal progress for the five workflow steps.
 * Completed steps show a check, the current step is filled, and every step is a link.
 */
export function Stepper() {
  const { pathname } = useLocation();
  const { isStepComplete } = useTeam();
  const current = WORKFLOW_STEPS.find((step) => step.path === pathname);
  if (!current) return null;

  const width = `${(current.number / WORKFLOW_STEPS.length) * 100}%`;

  return (
    <nav aria-label="Workflow" className="mb-8 print:hidden">
      <p className="label mb-3">
        Step {current.number} of {WORKFLOW_STEPS.length}
        <span className="ml-2 font-sans text-sm font-semibold normal-case tracking-normal text-ink dark:text-ink-dark">
          {current.label}
        </span>
      </p>
      <div
        className="mb-4 h-1.5 overflow-hidden rounded-full bg-line dark:bg-line-dark"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={WORKFLOW_STEPS.length}
        aria-valuenow={current.number}
        aria-valuetext={`Step ${current.number} of ${WORKFLOW_STEPS.length}: ${current.label}`}
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width }} />
      </div>
      <ol className="grid grid-cols-5 gap-1">
        {WORKFLOW_STEPS.map((step) => {
          const isCurrent = step.path === pathname;
          const done = isStepComplete(step.id);
          const showCheck = done && !isCurrent;
          const status = isCurrent
            ? done
              ? `${step.label}, current step, already complete`
              : `${step.label}, current step`
            : done
              ? `${step.label}, completed`
              : `${step.label}, not started`;

          return (
            <li key={step.id} className="min-w-0">
              <Link
                to={step.path}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={status}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-center transition-colors duration-200',
                  focusRing,
                  isCurrent
                    ? 'bg-primary-soft dark:bg-primary-soft-dark'
                    : 'hover:bg-primary-soft/70 dark:hover:bg-primary-soft-dark',
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold',
                    isCurrent && 'bg-primary text-white',
                    showCheck && 'bg-good-soft text-good-ink dark:bg-good-soft-dark dark:text-good-bright',
                    !isCurrent &&
                      !showCheck &&
                      'border border-line bg-card text-muted dark:border-line-dark dark:bg-card-dark dark:text-muted-dark',
                  )}
                >
                  {showCheck ? <Check className="h-4 w-4" aria-hidden="true" /> : step.number}
                </span>
                <span
                  className={cn(
                    'hidden w-full text-xs leading-tight sm:block',
                    isCurrent ? 'font-semibold text-ink dark:text-ink-dark' : 'text-muted dark:text-muted-dark',
                  )}
                >
                  {step.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
