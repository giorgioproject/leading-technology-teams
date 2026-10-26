import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ClipboardList, Link2 } from 'lucide-react';
import { Button, buttonClasses, cn, focusRing } from '../components/Button';
import { Callout } from '../components/Callout';
import { EmptyState } from '../components/EmptyState';
import { MeaningQuiz, type QuizTerm } from '../components/MeaningQuiz';
import { PageScaffold } from '../components/PageScaffold';
import { useTeam } from '../context/TeamContext';
import { decodeResult, encodeSurveyLink, responseFromCode, type QuizAnswers } from '../lib/encoding';
import { MAX_TERMS, MIN_SURVEY_RESPONSES, MIN_TERMS, type CharterTerm, type Member } from '../lib/types';

type TabId = 'link' | 'together';

function quizTerms(terms: CharterTerm[]): QuizTerm[] {
  return terms.map((term) => ({ id: term.id, label: term.label, meanings: term.meanings }));
}

/** Step 3. Send a quiz link, or pass one laptop around the room. */
export function SurveyPage() {
  const navigate = useNavigate();
  const { session, setResponses, upsertResponse } = useTeam();
  const [tab, setTab] = useState<TabId>('link');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [turnId, setTurnId] = useState<string | null>(null);
  const linkRef = useRef<HTMLTextAreaElement>(null);
  const baseId = useId();

  const named = session.members.filter((member) => member.name.trim() !== '');
  const termIds = session.selectedTerms.map((term) => term.id);
  const termsReady = termIds.length >= MIN_TERMS && termIds.length <= MAX_TERMS;
  const ready = named.length >= MIN_SURVEY_RESPONSES && termsReady;
  const encoded = ready
    ? encodeSurveyLink({
        teamName: session.teamName,
        memberNames: named.map((member) => member.name),
        terms: session.selectedTerms,
      })
    : null;
  const href =
    encoded?.ok && typeof window !== 'undefined' ? `${window.location.origin}/take?s=${encoded.value}` : '';
  const answered = named.filter((member) =>
    session.responses.some((response) => response.memberId === member.id),
  );
  const canContinue = answered.length >= MIN_SURVEY_RESPONSES;
  const turn = named.find((member) => member.id === turnId) ?? null;

  function commitCode(member: Member, raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setErrors((current) => ({ ...current, [member.id]: '' }));
      return;
    }
    const decoded = decodeResult(trimmed, termIds);
    if (!decoded.ok) {
      setErrors((current) => ({ ...current, [member.id]: decoded.error }));
      setResponses(session.responses.filter((response) => response.memberId !== member.id));
      return;
    }
    setErrors((current) => ({ ...current, [member.id]: '' }));
    upsertResponse(responseFromCode(member.id, member.name, decoded.value));
  }

  function clearMember(memberId: string) {
    setDrafts((current) => ({ ...current, [memberId]: '' }));
    setErrors((current) => ({ ...current, [memberId]: '' }));
    setResponses(session.responses.filter((response) => response.memberId !== memberId));
  }

  function saveTurn(member: Member, answers: QuizAnswers) {
    upsertResponse(responseFromCode(member.id, member.name, answers));
    setDrafts((current) => ({ ...current, [member.id]: '' }));
    setErrors((current) => ({ ...current, [member.id]: '' }));
  }

  async function copyLink() {
    if (!href) return;
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setCopyError('');
    } catch {
      setCopied(false);
      linkRef.current?.select();
      setCopyError('Copy did not work. Select the link and copy it yourself.');
    }
  }

  return (
    <PageScaffold
      title="Meaning Survey"
      description="Send each teammate a link, and paste the result code they send back. Or pass one laptop around and fill the quiz in together. You need answers from at least two people before the report is useful."
    >
      <Callout tone="how">
        Send this link in your team chat. Each member takes the quiz (2 minutes) and sends you back their result
        code. In the room, use Fill in together and pass the laptop around.
      </Callout>

      {!ready || !encoded?.ok ? (
        <EmptyState
          icon={ClipboardList}
          message={
            !termsReady
              ? 'Choose 4 to 6 charter terms before you send the quiz.'
              : named.length < MIN_SURVEY_RESPONSES
                ? 'Add at least two named teammates on Setup before you collect answers.'
                : encoded && !encoded.ok
                  ? encoded.error
                  : 'The quiz link could not be created.'
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="How to collect answers">
            <TabButton
              id={`${baseId}-link-tab`}
              controls={`${baseId}-link-panel`}
              selected={tab === 'link'}
              onSelect={() => setTab('link')}
            >
              Send a link
              <span className="font-normal text-muted dark:text-muted-dark">Recommended</span>
            </TabButton>
            <TabButton
              id={`${baseId}-together-tab`}
              controls={`${baseId}-together-panel`}
              selected={tab === 'together'}
              onSelect={() => setTab('together')}
            >
              Fill in together
            </TabButton>
          </div>

          {tab === 'link' ? (
            <div role="tabpanel" id={`${baseId}-link-panel`} aria-labelledby={`${baseId}-link-tab`} className="space-y-4">
              <p className="text-muted dark:text-muted-dark">
                Send this link in your team chat. Each member takes the quiz (2 minutes) and sends you back their
                result code.
              </p>
              <div>
                <label htmlFor="survey-link" className="text-sm font-medium text-ink dark:text-ink-dark">
                  Quiz link
                </label>
                <textarea
                  ref={linkRef}
                  id="survey-link"
                  readOnly
                  rows={3}
                  value={href}
                  onFocus={(event) => event.currentTarget.select()}
                  className="mt-1.5 w-full resize-y rounded-xl border border-line bg-paper px-3 py-2.5 font-mono text-sm leading-relaxed text-ink dark:border-line-dark dark:bg-paper-dark dark:text-ink-dark"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void copyLink()}>
                  <Link2 className="h-4 w-4" aria-hidden="true" />
                  {copied ? 'Copied' : 'Copy link'}
                </Button>
                <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClasses('secondary')}>
                  Open quiz link
                </a>
              </div>
              {copyError ? (
                <p role="alert" className="text-sm text-alert-ink dark:text-alert-bright">
                  {copyError}
                </p>
              ) : null}
              <ul className="space-y-3">
                {named.map((member, index) => {
                  const received = answered.some((item) => item.id === member.id);
                  const error = errors[member.id] ?? '';
                  const label = `Paste ${member.name.trim()}'s result code`;
                  return (
                    <li
                      key={member.id}
                      className="space-y-3 rounded-2xl border border-line bg-card p-4 shadow-sm dark:border-line-dark dark:bg-card-dark"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label htmlFor={`code-${member.id}`} className="text-sm font-medium text-ink dark:text-ink-dark">
                          {label}
                        </label>
                        {received ? (
                          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-good-ink dark:text-good-bright">
                            <Check className="h-4 w-4" aria-hidden="true" />
                            Answers received.
                          </span>
                        ) : null}
                      </div>
                      <input
                        id={`code-${member.id}`}
                        value={drafts[member.id] ?? ''}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? `code-${member.id}-error` : undefined}
                        placeholder="Paste the code"
                        autoComplete="off"
                        onChange={(event) => {
                          const next = event.target.value;
                          setDrafts((current) => ({ ...current, [member.id]: next }));
                          setCopied(false);
                          if (next.trim().length >= 24) commitCode(member, next);
                        }}
                        onBlur={(event) => commitCode(member, event.target.value)}
                        className={cn(
                          'w-full rounded-xl border bg-card px-3 py-2.5 font-mono text-sm text-ink dark:bg-card-dark dark:text-ink-dark',
                          focusRing,
                          error
                            ? 'border-alert dark:border-alert-bright'
                            : 'border-line dark:border-line-dark',
                        )}
                      />
                      {error ? (
                        <p id={`code-${member.id}-error`} role="alert" className="text-sm text-alert-ink dark:text-alert-bright">
                          {error}
                        </p>
                      ) : null}
                      {received ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => clearMember(member.id)}>
                          Clear {member.name.trim()}
                          {named.filter((item) => item.name.trim() === member.name.trim()).length > 1
                            ? ` (${index + 1})`
                            : ''}
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div
              role="tabpanel"
              id={`${baseId}-together-panel`}
              aria-labelledby={`${baseId}-together-tab`}
              className="space-y-4"
            >
              <p className="text-muted dark:text-muted-dark">
                Pass the laptop around. Each person answers privately, then you close their turn before the next
                person looks.
              </p>
              <ul className="space-y-3">
                {named.map((member) => {
                  const received = answered.some((item) => item.id === member.id);
                  return (
                    <li
                      key={member.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card p-4 shadow-sm dark:border-line-dark dark:bg-card-dark"
                    >
                      <div>
                        <p className="font-medium text-ink dark:text-ink-dark">{member.name.trim()}</p>
                        {received ? (
                          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-good-ink dark:text-good-bright">
                            <Check className="h-4 w-4" aria-hidden="true" />
                            Answers received.
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-muted dark:text-muted-dark">Not yet</p>
                        )}
                      </div>
                      <Button type="button" variant={received ? 'secondary' : 'primary'} onClick={() => setTurnId(member.id)}>
                        {received ? `Redo ${member.name.trim()}'s turn` : `Now it's ${member.name.trim()}'s turn`}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}

      <p id="survey-progress" aria-live="polite" className="text-sm font-medium text-ink dark:text-ink-dark">
        {answered.length} of {named.length} members have answered.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={() => navigate('/charter')}>
          Back
        </Button>
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
          <p id="survey-next-hint" className="text-sm text-muted dark:text-muted-dark">
            {canContinue
              ? 'At least two people have answered. You can open the transcript.'
              : `Answers from at least ${MIN_SURVEY_RESPONSES} people turn on the next step.`}
          </p>
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={!canContinue}
            aria-describedby="survey-next-hint"
            onClick={() => navigate('/transcript')}
          >
            Next: Transcript →
          </Button>
        </div>
      </div>

      {turn ? (
        <TurnDialog
          member={turn}
          terms={quizTerms(session.selectedTerms)}
          onSave={(answers) => saveTurn(turn, answers)}
          onClose={() => setTurnId(null)}
        />
      ) : null}
    </PageScaffold>
  );
}

function TabButton({
  id,
  controls,
  selected,
  onSelect,
  children,
}: {
  id: string;
  controls: string;
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-controls={controls}
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-200',
        focusRing,
        selected
          ? 'border-primary bg-primary text-white'
          : 'border-line bg-card text-ink dark:border-line-dark dark:bg-card-dark dark:text-ink-dark',
      )}
    >
      {children}
    </button>
  );
}

function TurnDialog({
  member,
  terms,
  onSave,
  onClose,
}: {
  member: Member;
  terms: QuizTerm[];
  onSave: (answers: QuizAnswers) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  onCloseRef.current = onClose;

  useEffect(() => {
    dialogRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const items = [...dialogRef.current.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href]')].filter(
        (element) => !element.hasAttribute('disabled'),
      );
      const first = items[0];
      const last = items[items.length - 1];
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
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center dark:bg-black/60">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-paper p-6 shadow-sm outline-none dark:border-line-dark dark:bg-paper-dark"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-[1.35rem] sm:text-[1.75rem]">
            Now it’s {member.name.trim()}’s turn. Others, look away 🙂
          </h2>
          <button type="button" className={cn(buttonClasses('ghost', 'sm'), 'shrink-0')} onClick={onClose}>
            Close
          </button>
        </div>
        <p className="mb-5 text-sm text-muted dark:text-muted-dark">Closing now discards this turn if it is not finished.</p>
        <MeaningQuiz
          key={member.id}
          terms={terms}
          fixedName={member.name.trim()}
          finish="save"
          onSave={onSave}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
