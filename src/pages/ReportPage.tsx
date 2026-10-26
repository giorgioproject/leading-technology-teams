import { useEffect, useMemo, useState } from 'react';
import { Copy, Printer } from 'lucide-react';
import { BarChart3 } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Button, cn, focusRing } from '../components/Button';
import { Callout } from '../components/Callout';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { PageScaffold, StepLinks } from '../components/PageScaffold';
import { ConversationTimeline, memberColor, ParticipationChart, UptakeChart } from '../components/ReportCharts';
import { useTeam } from '../context/TeamContext';
import { buildAiPrompt } from '../lib/aiPrompt';
import {
  DOMINANT_SHARE_MULTIPLIER,
  QUIET_SHARE_MULTIPLIER,
  analyzeSession,
  type AlignmentBand,
  type TeamAnalysis,
} from '../lib/analysis';
import { HIGH_SELF_RATING, LOW_SELF_RATING, buildNudges } from '../lib/nudges';
import type { MeaningKey } from '../lib/types';

const MEANING_COLOR: Record<MeaningKey, string> = {
  A: '#0072B2',
  B: '#E69F00',
  C: '#009E73',
  D: '#D55E00',
};

function percent(share: number): number {
  return Math.round(share * 100);
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function initialFor(name: string, names: string[]): string {
  const first = name.trim().split(/\s+/)[0] ?? name;
  const letter = first[0]?.toUpperCase() ?? '?';
  const clash = names.filter((item) => (item.trim()[0] ?? '').toUpperCase() === letter).length > 1;
  if (clash && first.length > 1) return `${letter}${first[1]?.toUpperCase() ?? ''}`;
  return letter;
}

function ratingGap(rating: number, share: number, equal: number): boolean {
  if (equal <= 0) return false;
  return (
    (rating >= HIGH_SELF_RATING && share < QUIET_SHARE_MULTIPLIER * equal) ||
    (rating <= LOW_SELF_RATING && share > DOMINANT_SHARE_MULTIPLIER * equal)
  );
}

function toneClass(label: string): string {
  if (label === 'Healthy') return 'text-good-ink dark:text-good-bright';
  if (label === 'Watch') return 'text-warn-ink dark:text-warn-bright';
  if (label === 'Needs attention') return 'text-alert-ink dark:text-alert-bright';
  return 'text-muted dark:text-muted-dark';
}

function meaningRead(score: number | null): { tone: string; value: string; detail: string } {
  if (score === null) return { tone: 'Waiting', value: '—', detail: 'Quiz answers will produce this score.' };
  const rounded = Math.round(score);
  if (score >= 75) return { tone: 'Healthy', value: String(rounded), detail: 'The team mostly means the same thing.' };
  if (score >= 50) return { tone: 'Watch', value: String(rounded), detail: 'Several words still need a shared definition.' };
  return { tone: 'Needs attention', value: String(rounded), detail: 'The same words are carrying different promises.' };
}

function balanceRead(analysis: TeamAnalysis): { tone: string; value: string; detail: string } {
  const score = analysis.participation.balance;
  if (score === null) return { tone: 'Waiting', value: '—', detail: 'A transcript will produce this score.' };
  const rounded = String(Math.round(score));
  if (analysis.participation.label === 'Balanced') {
    return { tone: 'Healthy', value: rounded, detail: 'Speaking time is close to even.' };
  }
  if (analysis.participation.label === 'Somewhat uneven') {
    return { tone: 'Watch', value: rounded, detail: 'One or two voices take more room.' };
  }
  return { tone: 'Needs attention', value: rounded, detail: 'Speaking time is concentrated.' };
}

function uptakeRead(analysis: TeamAnalysis): { tone: string; value: string; detail: string } {
  const { spreadCount, memberCount } = analysis.uptake;
  if (memberCount === 0 || analysis.turns.length === 0) {
    return { tone: 'Waiting', value: '—', detail: 'A transcript will show whose ideas were picked up.' };
  }
  const value = `${spreadCount} of ${memberCount}`;
  if (spreadCount === memberCount) return { tone: 'Healthy', value, detail: 'Ideas from every member were built on.' };
  if (spreadCount >= memberCount - 1) return { tone: 'Watch', value, detail: 'Most members had an idea the team picked up.' };
  return { tone: 'Needs attention', value, detail: 'Several members spoke without the team building on them.' };
}

function questionRead(count: number, ready: boolean): { tone: string; value: string; detail: string } {
  if (!ready) return { tone: 'Waiting', value: '—', detail: 'A transcript will list questions that got no reply.' };
  if (count === 0) return { tone: 'Healthy', value: '0', detail: 'Every question got a reply.' };
  if (count < 3) return { tone: 'Watch', value: String(count), detail: count === 1 ? 'One question got no reply.' : `${count} questions got no reply.` };
  return { tone: 'Needs attention', value: String(count), detail: `${count} questions got no reply.` };
}

function Kpi({ label, tone, value, detail }: { label: string; tone: string; value: string; detail: string }) {
  return (
    <Card className="report-section">
      <p className="label">{label}</p>
      <p className="mt-2 font-serif text-4xl leading-none text-ink dark:text-ink-dark">{value}</p>
      <p className={`mt-3 text-sm font-semibold ${toneClass(tone)}`}>{tone}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted dark:text-muted-dark">{detail}</p>
    </Card>
  );
}

/** Step 5. The team reads this together: meanings, voice, uptake, and a few next actions. */
export function ReportPage() {
  const { session } = useTeam();
  const analysis = useMemo(() => analyzeSession(session), [session]);
  const nudges = useMemo(() => buildNudges(analysis, session.responses), [analysis, session.responses]);
  const [shareMode, setShareMode] = useState<'words' | 'turns'>('words');
  const [aiNote, setAiNote] = useState('');
  const [aiCopied, setAiCopied] = useState(false);
  const prompt = useMemo(() => buildAiPrompt(session, analysis), [session, analysis]);

  async function copyPrompt() {
    setAiCopied(false);
    try {
      await navigator.clipboard.writeText(prompt);
      setAiNote('Copied. Paste it into an AI assistant.');
      setAiCopied(true);
    } catch {
      setAiNote('Copy did not work. Select the prompt and copy it yourself.');
      setAiCopied(false);
    }
  }

  useEffect(() => {
    if (aiCopied || aiNote === '') return;
    const field = document.getElementById('ai-prompt');
    if (field instanceof HTMLTextAreaElement) field.select();
  }, [aiCopied, aiNote]);

  const names = analysis.members.map((member) => member.name);
  const colors = new Map(analysis.members.map((member, index) => [member.id, memberColor(index)]));
  const hasTranscript = session.transcriptText.trim() !== '';
  const conversationReady = hasTranscript && analysis.parseError === null && analysis.turns.length > 0;
  const hasAnswers = session.responses.some((response) => analysis.members.some((member) => member.id === response.memberId));
  const empty =
    session.teamName.trim() === '' &&
    session.selectedTerms.length === 0 &&
    !hasTranscript &&
    session.responses.length === 0;

  const meaning = meaningRead(hasAnswers ? analysis.sharedMeaning : null);
  const balance = balanceRead(conversationReady ? analysis : { ...analysis, participation: { ...analysis.participation, balance: null, label: null } });
  const uptake = uptakeRead(conversationReady ? analysis : { ...analysis, turns: [] });
  const questions = questionRead(analysis.unanswered.length, conversationReady);
  const selfRatings = session.responses.filter((response) => response.selfRating !== undefined);

  if (empty) {
    return (
      <PageScaffold
        title="Report"
        description="Read this with your team. Start with the words you do not share, agree on a clearer charter line, then look at who spoke and whose ideas were picked up. You can print it or save it as a PDF."
      >
        <EmptyState
          icon={BarChart3}
          message="Finish the steps, or load the demo team, and shared meaning, participation, and idea uptake will show up here."
        />
        <div className="no-print">
          <StepLinks back={{ to: '/transcript', label: 'Back' }} />
        </div>
      </PageScaffold>
    );
  }

  return (
    <PageScaffold
      title="Report"
      documentTitle={session.teamName ? `${session.teamName} report · CommonGround` : 'Report · CommonGround'}
      description="Read this with your team. Start with the words you do not share, agree on a clearer charter line, then look at who spoke and whose ideas were picked up. You can print it or save it as a PDF."
    >
      <header className="report-section flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label">{formatDate(session.updatedAt)}</p>
          <p className="mt-1 font-serif text-3xl font-semibold tracking-tight text-ink dark:text-ink-dark">
            {session.teamName || 'Your team'}
          </p>
          <p className="mt-1 text-sm text-muted dark:text-muted-dark">
            {analysis.members.length} {analysis.members.length === 1 ? 'member' : 'members'}
            {conversationReady
              ? ` · ${analysis.participation.totalTurns} turns · ${analysis.participation.totalWords} words`
              : ''}
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print / Save as PDF
          </Button>
          <Button variant="secondary" onClick={() => void copyPrompt()}>
            <Copy className="h-4 w-4" aria-hidden="true" />
            Copy AI deep-analysis prompt
          </Button>
        </div>
      </header>
      {aiNote ? (
        <div className="no-print space-y-2">
          <p role="status" className="text-sm text-muted dark:text-muted-dark">
            {aiNote}
          </p>
          {aiCopied ? null : (
            <textarea
              id="ai-prompt"
              readOnly
              rows={8}
              value={prompt}
              aria-label="Deep-analysis prompt"
              className="w-full rounded-xl border border-line bg-card p-3 text-sm text-ink dark:border-line-dark dark:bg-card-dark dark:text-ink-dark"
            />
          )}
        </div>
      ) : null}

      <section aria-label="At a glance" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Shared meaning" {...meaning} />
        <Kpi label="Participation balance" {...balance} />
        <Kpi label="Idea uptake" {...uptake} />
        <Kpi label="Unanswered questions" {...questions} />
      </section>

      <section className="report-section space-y-4" aria-labelledby="map-heading">
        <h2 id="map-heading">Misalignment map</h2>
        {session.selectedTerms.length === 0 ? (
          <p className="text-sm text-muted dark:text-muted-dark">Choose 4 to 6 charter terms to see where the team agrees.</p>
        ) : !hasAnswers ? (
          <p className="text-sm text-muted dark:text-muted-dark">At least two quiz answers are needed before this map can be drawn.</p>
        ) : (
          analysis.terms.map((term) => (
            <Card key={term.termId} className="report-section">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3>{term.label}</h3>
                {term.respondents > 0 ? <Badge status={term.status as AlignmentBand} /> : <span className="text-sm text-muted">No answers yet</span>}
              </div>
              {term.respondents > 0 ? (
                <>
                  <div
                    className="mt-4 flex h-11 w-full overflow-hidden rounded-lg"
                    role="img"
                    aria-label={term.segments
                      .filter((segment) => segment.memberIds.length > 0)
                      .map((segment) => `${segment.key}, ${segment.memberIds.length}`)
                      .join('. ')}
                  >
                    {term.segments
                      .filter((segment) => segment.memberIds.length > 0)
                      .map((segment) => (
                        <div
                          key={segment.key}
                          className="flex items-center justify-center gap-1 overflow-hidden px-1 text-xs font-semibold"
                          style={{
                            width: `${(segment.memberIds.length / term.respondents) * 100}%`,
                            background: MEANING_COLOR[segment.key],
                            color: segment.key === 'B' ? '#1F2937' : '#FFFFFF',
                          }}
                        >
                          <span>{segment.key}</span>
                          {segment.memberIds.map((id) => {
                            const name = analysis.members.find((member) => member.id === id)?.name ?? '';
                            return <span key={id}>{initialFor(name, names)}</span>;
                          })}
                        </div>
                      ))}
                  </div>
                  <ul className="mt-4 space-y-2">
                    {term.segments.map((segment) => (
                      <li key={segment.key} className="text-sm leading-relaxed text-ink dark:text-ink-dark">
                        <span className="font-semibold">{segment.key}. </span>
                        {segment.text}
                        {segment.memberIds.length > 0 ? (
                          <span className="text-muted dark:text-muted-dark">
                            {' '}
                            — {segment.memberIds.map((id) => analysis.members.find((member) => member.id === id)?.name).filter(Boolean).join(', ')}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {term.rewrite ? (
                    <div className="mt-4 rounded-xl border border-accent/30 bg-accent-soft p-4 dark:border-accent/40 dark:bg-accent-soft-dark">
                      <p className="text-sm font-semibold">Suggested charter rewrite</p>
                      {term.sourceSentence ? (
                        <p className="mt-2 text-sm leading-relaxed">Charter now: “{term.sourceSentence}”</p>
                      ) : null}
                      <p className="mt-2 text-sm leading-relaxed">{term.rewrite}</p>
                      <p className="mt-2 text-sm leading-relaxed">Discuss as a team: which meaning should we commit to?</p>
                    </div>
                  ) : null}
                </>
              ) : null}
            </Card>
          ))
        )}
      </section>

      <section className="report-section space-y-3" aria-labelledby="scenario-heading">
        <h2 id="scenario-heading">Scenario styles</h2>
        {!hasAnswers ? (
          <p className="text-sm text-muted dark:text-muted-dark">Quiz answers will show how the team likes to decide, disagree, and respond to ideas.</p>
        ) : (
          <Card>
            <div className="space-y-4 sm:hidden">
              {analysis.members.map((member) => (
                <div key={member.id}>
                  <p className="font-medium">{member.name}</p>
                  <ul className="mt-1 space-y-1">
                    {analysis.scenarios.map((scenario) => {
                      const choice = scenario.choices.find((item) => item.memberId === member.id);
                      return (
                        <li key={scenario.scenarioId} className="text-sm text-muted dark:text-muted-dark">
                          <span className="text-ink dark:text-ink-dark">{scenario.dimension}: </span>
                          {choice?.text ?? 'No answer'}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
            <div className="hidden sm:block">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Each member’s choice on the three scenarios</caption>
                <thead className="border-b border-line text-muted dark:border-line-dark dark:text-muted-dark">
                  <tr>
                    <th scope="col" className="py-2 pr-3 font-medium">Member</th>
                    {analysis.scenarios.map((scenario) => (
                      <th key={scenario.scenarioId} scope="col" className="px-3 py-2 font-medium">
                        {scenario.dimension}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysis.members.map((member) => (
                    <tr key={member.id} className="border-b border-line last:border-b-0 dark:border-line-dark">
                      <th scope="row" className="py-3 pr-3 font-medium text-ink dark:text-ink-dark">
                        {member.name}
                      </th>
                      {analysis.scenarios.map((scenario) => {
                        const choice = scenario.choices.find((item) => item.memberId === member.id);
                        return (
                          <td key={scenario.scenarioId} className="px-3 py-3 text-muted dark:text-muted-dark">
                            {choice?.text ?? 'No answer'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 space-y-2">
              {analysis.scenarios.filter((scenario) => scenario.note).map((scenario) => (
                <p key={scenario.scenarioId} className="text-sm leading-relaxed text-ink dark:text-ink-dark">
                  <span className="font-semibold">{scenario.dimension}. </span>
                  {scenario.note}
                </p>
              ))}
            </div>
          </Card>
        )}
      </section>

      <section className="report-section space-y-3" aria-labelledby="participation-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="participation-heading">Participation</h2>
          {conversationReady ? (
            <div className="no-print flex rounded-xl border border-line p-1 dark:border-line-dark" role="group" aria-label="Participation measure">
              {(['words', 'turns'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={shareMode === mode}
                  className={cn(
                    'min-h-9 rounded-lg px-3 text-sm font-medium',
                    focusRing,
                    shareMode === mode
                      ? 'bg-primary-soft text-primary dark:bg-primary-soft-dark dark:text-primary-bright'
                      : 'text-muted dark:text-muted-dark',
                  )}
                  onClick={() => setShareMode(mode)}
                >
                  {mode === 'words' ? 'Words' : 'Turns'}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {!hasTranscript ? (
          <p className="text-sm text-muted dark:text-muted-dark">Add a transcript to see who spoke.</p>
        ) : analysis.parseError ? (
          <p role="alert" className="text-sm text-alert-ink dark:text-alert-bright">{analysis.parseError}</p>
        ) : (
          <Card>
            <ParticipationChart
              members={analysis.participation.members}
              colors={colors}
              mode={shareMode}
              equalShare={analysis.participation.equalShare}
            />
            <table className="mt-4 w-full text-left text-sm">
              <caption className="sr-only">Words, turns, and share for each member</caption>
              <thead className="border-b border-line text-muted dark:border-line-dark dark:text-muted-dark">
                <tr>
                  <th scope="col" className="py-2 font-medium">Member</th>
                  <th scope="col" className="px-3 py-2 font-medium">Words</th>
                  <th scope="col" className="px-3 py-2 font-medium">Turns</th>
                  <th scope="col" className="py-2 font-medium">Share</th>
                </tr>
              </thead>
              <tbody>
                {analysis.participation.members.map((member) => (
                  <tr key={member.memberId} className="border-b border-line last:border-b-0 dark:border-line-dark">
                    <th scope="row" className="py-2 font-medium text-ink dark:text-ink-dark">{member.name}</th>
                    <td className="px-3 py-2 text-muted dark:text-muted-dark">{member.words}</td>
                    <td className="px-3 py-2 text-muted dark:text-muted-dark">{member.turns}</td>
                    <td className="py-2 text-muted dark:text-muted-dark">
                      {percent(shareMode === 'words' ? member.wordShare : member.turnShare)}%
                      {shareMode === 'words' && member.dominant ? ' · more than an even split' : ''}
                      {shareMode === 'words' && member.quiet ? ' · quieter than an even split' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      <section className="report-section space-y-3" aria-labelledby="uptake-heading">
        <h2 id="uptake-heading">Idea uptake</h2>
        <Callout tone="why" title="How to read this">
          Talking time ≠ influence. Uptake shows whose ideas actually shaped the discussion.
        </Callout>
        {conversationReady ? (
          <Card>
            <UptakeChart members={analysis.uptake.members} />
            <table className="mt-4 w-full text-left text-sm">
              <caption className="sr-only">Ideas picked up, ideas built on, and uptake rate</caption>
              <thead className="border-b border-line text-muted dark:border-line-dark dark:text-muted-dark">
                <tr>
                  <th scope="col" className="py-2 font-medium">Member</th>
                  <th scope="col" className="px-3 py-2 font-medium">Picked up</th>
                  <th scope="col" className="px-3 py-2 font-medium">Built on others</th>
                  <th scope="col" className="py-2 font-medium">Uptake rate</th>
                </tr>
              </thead>
              <tbody>
                {analysis.uptake.members.map((member) => (
                  <tr key={member.memberId} className="border-b border-line last:border-b-0 dark:border-line-dark">
                    <th scope="row" className="py-2 font-medium text-ink dark:text-ink-dark">{member.name}</th>
                    <td className="px-3 py-2 text-muted dark:text-muted-dark">{member.ideasPickedUp}</td>
                    <td className="px-3 py-2 text-muted dark:text-muted-dark">{member.builtOnOthers}</td>
                    <td className="py-2 text-muted dark:text-muted-dark">{percent(member.uptakeRate)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 space-y-2">
              {analysis.uptake.members.flatMap((member) =>
                member.examples.map((example) => (
                  <p key={`${example.sourceTurnIndex}-${example.targetMemberId}`} className="text-sm leading-relaxed text-ink dark:text-ink-dark">
                    {member.name}’s idea about <em>{example.phrase}</em> was picked up by {example.targetName}.
                  </p>
                )),
              )}
            </div>
          </Card>
        ) : (
          <p className="text-sm text-muted dark:text-muted-dark">Add a transcript to see whose ideas the team built on.</p>
        )}
      </section>

      <section className="report-section space-y-3" aria-labelledby="timeline-heading">
        <h2 id="timeline-heading">Conversation timeline</h2>
        {conversationReady ? (
          <Card>
            <ConversationTimeline turns={analysis.turns} colors={colors} names={new Map(analysis.members.map((member) => [member.id, member.name]))} />
            {analysis.interruptions.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {analysis.interruptions.map((item, index) => (
                  <li key={`${item.fromMemberId}-${index}`} className="text-sm leading-relaxed text-muted dark:text-muted-dark">
                    Approximate:{' '}
                    {item.kind === 'overlap'
                      ? `${item.byName} started speaking before ${item.fromName} had finished.`
                      : `${item.fromName}’s turn ended with a dash or an ellipsis, and ${item.byName} spoke next.`}{' '}
                    This is a text guess, not proof of an interruption.
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        ) : (
          <p className="text-sm text-muted dark:text-muted-dark">The timeline appears once a transcript has at least two speakers.</p>
        )}
      </section>

      <section className="report-section space-y-3" aria-labelledby="questions-heading">
        <h2 id="questions-heading">Questions</h2>
        {conversationReady ? (
          analysis.unanswered.length > 0 ? (
            <ul className="space-y-3">
              {analysis.unanswered.map((item) => (
                <li key={item.turnIndex} className="rounded-2xl border border-line bg-card p-4 text-sm shadow-sm dark:border-line-dark dark:bg-card-dark">
                  <p className="font-medium text-ink dark:text-ink-dark">{item.name}</p>
                  <p className="mt-1 leading-relaxed text-muted dark:text-muted-dark">{item.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted dark:text-muted-dark">No unanswered questions in this transcript.</p>
          )
        ) : (
          <p className="text-sm text-muted dark:text-muted-dark">Questions that nobody else replied to will be listed here.</p>
        )}
      </section>

      {selfRatings.length > 0 ? (
        <section className="report-section space-y-3" aria-labelledby="perception-heading">
          <h2 id="perception-heading">Perception vs reality</h2>
          <ul className="space-y-3">
            {analysis.members.map((member) => {
              const response = session.responses.find((item) => item.memberId === member.id);
              const speech = analysis.participation.members.find((item) => item.memberId === member.id);
              if (response?.selfRating === undefined || !speech) return null;
              const gap = conversationReady && ratingGap(response.selfRating, speech.wordShare, analysis.participation.equalShare);
              const note = session.assessments[member.id]?.notes;
              return (
                <li key={member.id} className="rounded-2xl border border-line bg-card p-4 shadow-sm dark:border-line-dark dark:bg-card-dark">
                  <p className="text-sm leading-relaxed text-ink dark:text-ink-dark">
                    <span className="font-semibold">{member.name}</span> rated their contribution {response.selfRating}/5
                    {conversationReady ? ` and spoke ${percent(speech.wordShare)}% of the words. An equal share would be ${percent(analysis.participation.equalShare)}%.` : '.'}
                  </p>
                  {gap ? (
                    <p className="mt-2 text-sm leading-relaxed text-muted dark:text-muted-dark">
                      This gap is worth a gentle look. Contribution also happens outside the meeting.
                    </p>
                  ) : null}
                  {note ? <p className="mt-2 text-sm leading-relaxed text-muted dark:text-muted-dark">Note: {note}</p> : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {analysis.unmappedSpeakers.length > 0 ? (
        <p className="text-sm text-muted dark:text-muted-dark">
          Match these speakers on the Transcript step, or choose Ignore: {analysis.unmappedSpeakers.join(', ')}. They are left out of the scores until you do.
        </p>
      ) : null}

      <section className="report-section space-y-3" aria-labelledby="nudges-heading">
        <h2 id="nudges-heading">Individual nudges</h2>
        {nudges.teamNotes.map((note) => (
          <Callout key={note} tone="why" title="For the whole team">
            {note}
          </Callout>
        ))}
        <div className="grid gap-4 md:grid-cols-2">
          {nudges.members.map((member) => (
            <Card key={member.memberId} className="report-section">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: colors.get(member.memberId) }} aria-hidden="true" />
                <h3>{member.name}</h3>
              </div>
              <ul className="mt-3 space-y-2">
                {member.nudges.map((line) => (
                  <li key={line} className="text-sm leading-relaxed text-ink dark:text-ink-dark">
                    {line}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <section className="report-section space-y-3" aria-labelledby="plan-heading">
        <h2 id="plan-heading">Team action plan</h2>
        {nudges.actions.length > 0 ? (
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink dark:text-ink-dark">
            {nudges.actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted dark:text-muted-dark">Nothing in this meeting crossed the action thresholds.</p>
        )}
        <p className="text-sm text-muted dark:text-muted-dark">Re-run CommonGround after your next meeting to see progress.</p>
      </section>

      <section className="report-section space-y-2" aria-labelledby="method-heading">
        <h2 id="method-heading">Method and limits</h2>
        <p className="text-sm leading-relaxed text-muted dark:text-muted-dark">
          These are text-based approximations. The transcript does not capture tone, body language, or work done outside meetings. Interruptions are approximate. Use this report to start a conversation, not to judge people.
        </p>
      </section>

      <div className="no-print">
        <StepLinks back={{ to: '/transcript', label: 'Back' }} />
      </div>
    </PageScaffold>
  );
}
