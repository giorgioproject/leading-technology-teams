import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, buttonClasses, cn, focusRing } from '../components/Button';
import { PageScaffold } from '../components/PageScaffold';
import { TextField } from '../components/TextField';
import { useTeam } from '../context/TeamContext';
import { parseTranscript } from '../lib/transcriptParser';
import { IGNORE_SPEAKER, type Member, type MemberAssessment } from '../lib/types';

const controlClass = cn(
  'mt-1.5 min-h-11 w-full rounded-xl border border-line bg-card px-3 text-base text-ink dark:border-line-dark dark:bg-card-dark dark:text-ink-dark',
  focusRing,
);

function guessMemberId(speaker: string, members: Member[]): string {
  const speakerKey = speaker.trim().toLowerCase();
  const exact = members.find((member) => member.name.trim().toLowerCase() === speakerKey);
  if (exact) return exact.id;
  const matches = members.filter((member) => {
    const name = member.name.trim().toLowerCase();
    if (!name) return false;
    return speakerKey.startsWith(`${name} `) || speakerKey.endsWith(` ${name}`);
  });
  if (matches.length === 1 && matches[0]) return matches[0].id;
  return '';
}

function firstWords(text: string): string {
  const words = text.trim().split(/\s+/).filter((word) => word !== '');
  const shown = words.slice(0, 8).join(' ');
  return words.length > 8 ? `${shown}…` : shown;
}

function choiceIsSet(choice: string | undefined, members: Member[]): boolean {
  if (!choice) return false;
  if (choice === IGNORE_SPEAKER) return true;
  return members.some((member) => member.id === choice);
}

/** Step 4. Paste a transcript, match speakers, and optionally add a participation note. */
export function TranscriptPage() {
  const navigate = useNavigate();
  const { session, setTranscriptText, setSpeakerMap, setAssessment } = useTeam();
  const parsed = useMemo(() => parseTranscript(session.transcriptText), [session.transcriptText]);
  const named = useMemo(
    () => session.members.filter((member) => member.name.trim() !== ''),
    [session.members],
  );
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    if (parsed.speakers.length === 0) {
      if (Object.keys(session.speakerMap).length > 0) setSpeakerMap({});
      return;
    }
    const next: Record<string, string> = {};
    for (const speaker of parsed.speakers) {
      const previous = session.speakerMap[speaker];
      if (previous === IGNORE_SPEAKER || named.some((member) => member.id === previous)) {
        next[speaker] = previous;
      } else if (previous === '') {
        next[speaker] = '';
      } else {
        next[speaker] = guessMemberId(speaker, named);
      }
    }
    const sameSize = Object.keys(next).length === Object.keys(session.speakerMap).length;
    const sameValues = Object.entries(next).every(([speaker, choice]) => session.speakerMap[speaker] === choice);
    if (!sameSize || !sameValues) setSpeakerMap(next);
  }, [named, parsed.speakers, session.speakerMap, setSpeakerMap]);

  useEffect(() => {
    for (const member of named) {
      const response = session.responses.find((item) => item.memberId === member.id);
      if (response?.selfRating === undefined) continue;
      const existing = session.assessments[member.id];
      if (existing?.participationRating !== undefined) continue;
      const next: MemberAssessment = { participationRating: response.selfRating };
      if (existing?.notes) next.notes = existing.notes;
      setAssessment(member.id, next);
    }
  }, [named, session.assessments, session.responses, setAssessment]);

  const readyToMap = parsed.error === null && parsed.speakers.length >= 2;
  const allMatched = parsed.speakers.every((speaker) => choiceIsSet(session.speakerMap[speaker], named));
  const canGenerate = readyToMap && allMatched;

  function onFile(file: File | undefined) {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.txt') && !lower.endsWith('.vtt') && !lower.endsWith('.srt')) {
      setFileError('Upload a .txt, .vtt, or .srt file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result.replace(/^\uFEFF/, '') : '';
      setFileError('');
      setTranscriptText(text);
    };
    reader.onerror = () => setFileError('That file could not be read.');
    reader.readAsText(file);
  }

  return (
    <PageScaffold
      title="Transcript"
      description="Paste a transcript or upload a .txt, .vtt, or .srt file. Lines can start with a name and a colon, or come from a Zoom, Teams, or Otter export. You will match speaker names to your members before the report."
    >
      <details className="rounded-2xl border border-line bg-card p-4 shadow-sm dark:border-line-dark dark:bg-card-dark">
        <summary className={cn('cursor-pointer text-sm font-medium text-ink dark:text-ink-dark', focusRing)}>
          Which formats work?
        </summary>
        <ul className="mt-4 space-y-4">
          <FormatSample
            name="Name and a colon"
            detail="One turn per line. A line without a name is added to the previous turn."
            sample={'Sara: I think we should start with the survey.'}
          />
          <FormatSample
            name="Zoom or Teams .vtt"
            detail="Timestamps are kept. The speaker comes from a <v Name> tag or a Name: line."
            sample={'<v Sara>I think we should start with the survey.'}
          />
          <FormatSample
            name="Otter-style"
            detail="The name and a timestamp sit on their own line. The words follow on the next lines."
            sample={'Sara  0:42\nI think we should start with the survey.'}
          />
        </ul>
      </details>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <TextField
          id="transcript-text"
          label="Meeting transcript"
          rows={12}
          value={session.transcriptText}
          onChange={setTranscriptText}
          placeholder="Sara: I think we should start with the survey."
          error={session.transcriptText.trim() && parsed.error ? parsed.error : ''}
        />
        <div>
          <input
            id="transcript-file"
            type="file"
            accept=".txt,.vtt,.srt,text/plain,text/vtt"
            className="sr-only"
            onChange={(event) => {
              onFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <label htmlFor="transcript-file" className={cn(buttonClasses('secondary'), 'cursor-pointer')}>
            Upload .txt, .vtt, or .srt
          </label>
          {fileError ? (
            <p role="alert" className="mt-2 text-sm text-alert-ink dark:text-alert-bright">
              {fileError}
            </p>
          ) : null}
        </div>
      </form>

      {parsed.turns.length > 0 ? (
        <section aria-labelledby="preview-heading" className="space-y-3">
          <h2 id="preview-heading" className="text-[1.35rem] sm:text-[1.75rem]">
            Speakers in this transcript
          </h2>
          <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm dark:border-line-dark dark:bg-card-dark">
            <table className="w-full table-fixed text-left text-sm">
              <caption className="sr-only">Speaker, number of turns, and the opening words</caption>
              <thead className="border-b border-line text-muted dark:border-line-dark dark:text-muted-dark">
                <tr>
                  <th scope="col" className="w-[28%] px-4 py-3 font-medium">
                    Speaker
                  </th>
                  <th scope="col" className="w-[18%] px-4 py-3 font-medium">
                    Turns
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    First words
                  </th>
                </tr>
              </thead>
              <tbody>
                {parsed.speakers.map((speaker) => {
                  const turns = parsed.turns.filter((turn) => turn.speaker === speaker);
                  const opening = turns[0]?.text ?? '';
                  return (
                    <tr key={speaker} className="border-b border-line last:border-b-0 dark:border-line-dark">
                      <th scope="row" className="px-4 py-3 font-medium text-ink dark:text-ink-dark">
                        {speaker}
                      </th>
                      <td className="px-4 py-3 text-muted dark:text-muted-dark">{turns.length}</td>
                      <td className="break-words px-4 py-3 text-muted dark:text-muted-dark">{firstWords(opening)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {readyToMap ? (
        <section aria-labelledby="match-heading" className="space-y-3">
          <h2 id="match-heading" className="text-[1.35rem] sm:text-[1.75rem]">
            Match speakers to the team
          </h2>
          <p className="text-sm text-muted dark:text-muted-dark">
            If a transcript name differs from the team list, choose the person. Ignore a professor or a guest.
          </p>
          <ul className="space-y-3">
            {parsed.speakers.map((speaker, index) => {
              const choice = session.speakerMap[speaker] ?? '';
              const fieldId = `speaker-${index}`;
              return (
                <li
                  key={speaker}
                  className="rounded-2xl border border-line bg-card p-4 shadow-sm dark:border-line-dark dark:bg-card-dark"
                >
                  <label htmlFor={fieldId} className="text-sm font-medium text-ink dark:text-ink-dark">
                    {speaker}
                  </label>
                  <select
                    id={fieldId}
                    value={choice}
                    onChange={(event) =>
                      setSpeakerMap({ ...session.speakerMap, [speaker]: event.target.value })
                    }
                    className={controlClass}
                  >
                    <option value="">Choose a teammate</option>
                    {named.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name.trim()}
                      </option>
                    ))}
                    <option value={IGNORE_SPEAKER}>Ignore</option>
                  </select>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {named.length > 0 ? (
        <section aria-labelledby="notes-heading" className="space-y-3">
          <h2 id="notes-heading" className="text-[1.35rem] sm:text-[1.75rem]">
            Add Breakout Learning or self-assessment notes
          </h2>
          <p className="text-sm text-muted dark:text-muted-dark">
            Optional. A quiz self-rating is filled in when that person sent one.
          </p>
          <ul className="space-y-3">
            {named.map((member) => {
              const assessment = session.assessments[member.id];
              const response = session.responses.find((item) => item.memberId === member.id);
              const rating = assessment?.participationRating ?? response?.selfRating;
              return (
                <li
                  key={member.id}
                  className="space-y-3 rounded-2xl border border-line bg-card p-4 shadow-sm dark:border-line-dark dark:bg-card-dark"
                >
                  <p className="font-medium text-ink dark:text-ink-dark">{member.name.trim()}</p>
                  <div>
                    <label htmlFor={`rating-${member.id}`} className="text-sm font-medium text-ink dark:text-ink-dark">
                      Participation, 1 to 5
                    </label>
                    <select
                      id={`rating-${member.id}`}
                      value={rating ?? ''}
                      onChange={(event) => {
                        const next: MemberAssessment = { notes: assessment?.notes };
                        const picked = Number(event.target.value);
                        if (event.target.value !== '') next.participationRating = picked;
                        if (!next.notes) delete next.notes;
                        setAssessment(member.id, next);
                      }}
                      className={controlClass}
                    >
                      <option value="">Not set</option>
                      {[1, 2, 3, 4, 5].map((score) => (
                        <option key={score} value={score}>
                          {score}
                        </option>
                      ))}
                    </select>
                    {response?.selfRating !== undefined ? (
                      <p className="mt-1.5 text-sm text-muted dark:text-muted-dark">
                        The quiz answer was {response.selfRating}.
                      </p>
                    ) : null}
                  </div>
                  <TextField
                    id={`notes-${member.id}`}
                    label="Notes"
                    optional
                    value={assessment?.notes ?? ''}
                    onChange={(notes) => {
                      const next: MemberAssessment = { notes };
                      if (assessment?.participationRating !== undefined) {
                        next.participationRating = assessment.participationRating;
                      } else if (response?.selfRating !== undefined) {
                        next.participationRating = response.selfRating;
                      }
                      if (!notes.trim()) delete next.notes;
                      setAssessment(member.id, next);
                    }}
                    placeholder="What the breakout notes said"
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={() => navigate('/survey')}>
          Back
        </Button>
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
        <p id="transcript-next-hint" className="text-sm text-muted dark:text-muted-dark">
          {canGenerate
            ? 'Speakers are matched. You can generate the report.'
            : parsed.error
              ? 'The report needs at least two speakers in a supported format.'
              : 'Match every speaker to a teammate, or choose Ignore, before the report.'}
        </p>
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={!canGenerate}
            aria-describedby="transcript-next-hint"
            onClick={() => navigate('/report')}
          >
            Generate report →
          </Button>
        </div>
      </div>
    </PageScaffold>
  );
}

function FormatSample({ name, detail, sample }: { name: string; detail: string; sample: string }) {
  return (
    <li>
      <p className="text-sm font-medium text-ink dark:text-ink-dark">{name}</p>
      <p className="mt-1 text-sm text-muted dark:text-muted-dark">{detail}</p>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-paper px-3 py-2 font-mono text-sm text-ink dark:bg-paper-dark dark:text-ink-dark">
        {sample}
      </pre>
    </li>
  );
}
