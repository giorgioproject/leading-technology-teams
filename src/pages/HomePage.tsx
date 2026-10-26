import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  ClipboardList,
  FileText,
  Lock,
  Map,
  PenLine,
  ScrollText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button, buttonClasses, cn } from '../components/Button';
import { Card } from '../components/Card';
import { useTeam } from '../context/TeamContext';
import { MEMBER_COLORS } from '../lib/types';

const meanings = [
  { label: 'before the deadline', color: MEMBER_COLORS[0] },
  { label: '24h early', color: MEMBER_COLORS[2] },
  { label: 'draft at the check-in', color: MEMBER_COLORS[3] },
  { label: "when it's good", color: MEMBER_COLORS[4] },
] as const;

const steps: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ScrollText,
    title: 'Decode your charter',
    body: 'Paste it and choose 4 to 6 vague terms to test.',
  },
  {
    icon: ClipboardList,
    title: 'Run the 2-minute Meaning Survey',
    body: 'Each teammate picks what those words mean to them.',
  },
  {
    icon: FileText,
    title: 'Add a meeting transcript',
    body: 'See who spoke, and whose ideas others built on.',
  },
  {
    icon: BarChart3,
    title: 'Get your team report',
    body: 'Read the results together, then rewrite the fuzzy lines.',
  },
];

const outcomes: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Map,
    title: 'Misalignment Map',
    body: 'Which charter words the team defines differently.',
  },
  {
    icon: BarChart3,
    title: 'Participation & Idea Uptake',
    body: 'Speaking time, and whose ideas actually shaped the discussion.',
  },
  {
    icon: PenLine,
    title: 'Personal nudges + charter rewrite',
    body: 'A concrete replacement for each fuzzy term, and an encouraging next step for each person.',
  },
];

/** Landing page. The hero copy is the product’s own line; the rest shows how a leader uses it. */
export function HomePage() {
  const { loadDemoTeam } = useTeam();

  useEffect(() => {
    document.title = 'CommonGround';
  }, []);

  return (
    <div className="space-y-16 sm:space-y-20">
      <header className="max-w-2xl space-y-6">
        <h1>Same words. Different meanings.</h1>
        <p className="text-base leading-[1.6] text-muted dark:text-muted-dark sm:text-lg">
          CommonGround shows team leaders where their team quietly disagrees, and whose ideas are
          actually shaping the work.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to="/setup" className={cn(buttonClasses('primary'), 'w-full sm:w-auto')}>
            Start with my team
          </Link>
          <Button variant="secondary" className="w-full sm:w-auto" onClick={loadDemoTeam}>
            Try the demo
          </Button>
        </div>
      </header>

      <section aria-labelledby="example-heading">
        <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_9.5rem_1fr] md:gap-x-6 md:gap-y-4">
          <div className="mx-auto flex h-36 w-36 flex-col items-center justify-center rounded-full border border-line bg-card shadow-sm md:col-start-2 md:row-start-1 md:row-span-2 dark:border-line-dark dark:bg-card-dark">
            <span className="label">Charter</span>
            <span className="mt-1 font-serif text-2xl font-semibold tracking-tight">on time</span>
          </div>
          {meanings.map((item, index) => (
            <div
              key={item.label}
              className={cn(
                'flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 shadow-sm dark:border-line-dark dark:bg-card-dark',
                index === 0 && 'md:col-start-1 md:row-start-1',
                index === 1 && 'md:col-start-3 md:row-start-1',
                index === 2 && 'md:col-start-1 md:row-start-2',
                index === 3 && 'md:col-start-3 md:row-start-2',
              )}
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-ink dark:text-ink-dark"
                style={{ backgroundColor: `${item.color}33`, boxShadow: `inset 0 0 0 2px ${item.color}` }}
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <p>
                <span className="label">Teammate {index + 1}</span>
                <span className="mt-0.5 block font-medium">“{item.label}”</span>
              </p>
            </div>
          ))}
        </div>
        <h2 id="example-heading" className="mx-auto mt-8 max-w-xl text-center">
          Four teammates. One charter. Four definitions.
        </h2>
      </section>

      <section aria-labelledby="how-heading" className="space-y-6">
        <div className="max-w-2xl space-y-3">
          <h2 id="how-heading">How it works</h2>
          <p className="text-muted dark:text-muted-dark">
            Four steps. About ten minutes from you, plus a two-minute quiz from each teammate.
          </p>
        </div>
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title}>
              <Card className="h-full">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary dark:bg-primary-soft-dark dark:text-primary-bright">
                  <step.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="label mt-4">Step {index + 1}</p>
                <h3 className="mt-2">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted dark:text-muted-dark">{step.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="outcomes-heading" className="space-y-6">
        <div className="max-w-2xl space-y-3">
          <h2 id="outcomes-heading">What you get</h2>
          <p className="text-muted dark:text-muted-dark">
            A report you can read together, then print or save as a PDF.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {outcomes.map((item) => (
            <li key={item.title}>
              <Card className="h-full">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-warn-ink dark:bg-accent-soft-dark dark:text-accent-bright">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted dark:text-muted-dark">{item.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Privacy" className="flex items-start gap-3 rounded-2xl border border-line bg-card px-5 py-4 shadow-sm dark:border-line-dark dark:bg-card-dark">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary dark:text-primary-bright" aria-hidden="true" />
        <p className="font-medium">No accounts. No servers. Everything stays in your browser.</p>
      </section>

      <section
        aria-labelledby="cta-heading"
        className="rounded-2xl bg-primary-soft px-6 py-10 text-center dark:bg-primary-soft-dark sm:px-10"
      >
        <h2 id="cta-heading">Use it with your team</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted dark:text-muted-dark">
          Set up in a few minutes, or load the demo and read a sample report.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/setup" className={cn(buttonClasses('primary'), 'w-full sm:w-auto')}>
            Start with my team
          </Link>
          <Button variant="secondary" className="w-full sm:w-auto" onClick={loadDemoTeam}>
            Try the demo
          </Button>
        </div>
      </section>
    </div>
  );
}
