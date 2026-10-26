import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button, focusRing, cn } from '../components/Button';
import { Card } from '../components/Card';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageScaffold } from '../components/PageScaffold';
import { useTeam } from '../context/TeamContext';

const needs = [
  'Your team charter (copy the text).',
  'A recorded meeting transcript (Zoom, Teams, or Otter export).',
  'Your teammates, who each need 2 minutes for the quiz.',
  'Optional: Breakout Learning feedback or self-ratings.',
];

const steps: { title: string; body: string; to?: string; linkLabel?: string }[] = [
  {
    title: 'Setup',
    body: 'Enter your team name and members. Use the names as they appear in the transcript.',
    to: '/setup',
    linkLabel: 'Open Setup',
  },
  {
    title: 'Charter',
    body: 'Paste your charter, click “Find vague terms,” and choose 4–6 terms. Add your own if the list misses one.',
    to: '/charter',
    linkLabel: 'Open Charter',
  },
  {
    title: 'Meaning Survey',
    body: 'Copy the link and send it to your team. Each person sends back a result code, and you paste the codes in. Or use “Fill in together” during a meeting.',
    to: '/survey',
    linkLabel: 'Open the survey step',
  },
  {
    title: 'Transcript',
    body: 'Paste or upload your transcript. Check the speaker matching so each line is tied to the right person.',
    to: '/transcript',
    linkLabel: 'Open Transcript',
  },
  {
    title: 'Report',
    body: 'Read the results together as a team. Start with the Misalignment Map, agree on charter rewrites, then share the individual nudges privately or as a group, whichever your team prefers.',
    to: '/report',
    linkLabel: 'Open the report',
  },
  {
    title: 'Repeat',
    body: 'Run CommonGround again after your next meeting to see whether the changes held.',
  },
];

const formats = [
  {
    name: 'Name and a colon',
    detail: 'One turn per line. A line without a name is added to the previous turn.',
    sample: 'Sara: I think we should start with the survey.',
  },
  {
    name: 'Zoom or Teams .vtt',
    detail: 'Timestamps are kept for timing. The speaker comes from a <v Name> tag or a Name: line.',
    sample: '<v Sara>I think we should start with the survey.',
  },
  {
    name: 'Otter-style',
    detail: 'The name and a timestamp sit on their own line. The words follow on the next lines.',
    sample: 'Sara  0:42\nI think we should start with the survey.',
  },
];

/** Instructions a team leader can follow without asking anyone else. */
export function GuidePage() {
  const { clearAll, loadDemoTeam } = useTeam();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  function confirmClear() {
    clearAll();
    setOpen(false);
  }

  return (
    <PageScaffold
      eyebrow="For team leaders"
      title="Guide"
      description="About 10 minutes of your time, plus 2 minutes from each teammate. Everything below is the whole set of instructions."
    >
      <div className="max-w-3xl space-y-12">
        <section aria-labelledby="needs-heading" className="space-y-4">
          <h2 id="needs-heading">What you need before starting</h2>
          <ul className="space-y-3">
            {needs.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary dark:bg-primary-soft-dark dark:text-primary-bright">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="steps-heading" className="space-y-4">
          <h2 id="steps-heading">Steps</h2>
          <ol className="space-y-4">
            {steps.map((step, index) => (
              <li key={step.title}>
                <Card>
                  <div className="flex gap-4">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <h3>{step.title}</h3>
                      <p className="mt-1 text-muted dark:text-muted-dark">{step.body}</p>
                      {step.to && step.linkLabel ? (
                        <Link
                          to={step.to}
                          className={cn(
                            'mt-3 inline-flex rounded-lg font-medium text-primary hover:underline dark:text-primary-bright',
                            focusRing,
                          )}
                        >
                          {step.linkLabel}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="formats-heading" className="space-y-4">
          <div className="space-y-2">
            <h2 id="formats-heading">Transcript formats that work</h2>
            <p className="text-muted dark:text-muted-dark">
              Paste the text or upload a .txt, .vtt, or .srt file. If a speaker’s name does not match
              your member list, you match them on the Transcript step. A professor or guest can be ignored.
            </p>
          </div>
          <ul className="space-y-4">
            {formats.map((format) => (
              <li key={format.name}>
                <Card>
                  <h3>{format.name}</h3>
                  <p className="mt-1 text-sm text-muted dark:text-muted-dark">{format.detail}</p>
                  <pre className="mt-3 overflow-x-auto rounded-xl bg-primary-soft px-4 py-3 font-mono text-sm leading-relaxed text-ink dark:bg-primary-soft-dark dark:text-ink-dark">
                    {format.sample}
                  </pre>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="faq-heading" className="space-y-4">
          <h2 id="faq-heading">FAQ</h2>
          <div className="space-y-4">
            <Card>
              <h3>Is my data stored anywhere?</h3>
              <p className="mt-2 text-muted dark:text-muted-dark">
                No. Everything stays in your browser. Clear all data deletes the team, the charter, the
                survey answers, and the transcript from this browser.
              </p>
              <Button variant="secondary" className="mt-4" onClick={() => setOpen(true)}>
                Clear all data
              </Button>
            </Card>
            <Card>
              <h3>My transcript isn’t parsing.</h3>
              <p className="mt-2 text-muted dark:text-muted-dark">
                Make sure each line starts with <span className="font-medium text-ink dark:text-ink-dark">Name:</span>{' '}
                or upload a .vtt export from Zoom or Teams. The formats above are the ones the parser expects.
              </p>
            </Card>
            <Card>
              <h3>Is this a judgment of my teammates?</h3>
              <p className="mt-2 text-muted dark:text-muted-dark">
                No. It is a conversation starter. Text cannot capture tone, body language, or work done
                outside the meeting. Read the report together, and use it to agree on clearer habits.
              </p>
            </Card>
            <Card>
              <h3>Can I try it first?</h3>
              <p className="mt-2 text-muted dark:text-muted-dark">
                Yes. Click Load demo team and read the sample report before you enter your own charter.
              </p>
              <Button variant="secondary" className="mt-4" onClick={loadDemoTeam}>
                Load demo team
              </Button>
            </Card>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={open}
        title="Clear all data?"
        body="This deletes the team, charter, survey answers, and transcript stored in this browser. It cannot be undone."
        confirmLabel="Delete data"
        onConfirm={confirmClear}
        onCancel={close}
      />
    </PageScaffold>
  );
}
