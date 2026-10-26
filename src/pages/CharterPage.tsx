import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Plus } from 'lucide-react';
import { Button, buttonClasses, cn, focusRing } from '../components/Button';
import { Callout } from '../components/Callout';
import { PageScaffold } from '../components/PageScaffold';
import { TextField } from '../components/TextField';
import { useTeam } from '../context/TeamContext';
import { findVagueTerms, type TermHit } from '../lib/charterParser';
import { TERM_LIBRARY, customRewriteTemplate, libraryTermById } from '../lib/termLibrary';
import {
  MAX_TERMS,
  MIN_TERMS,
  createId,
  type CharterTerm,
  type FourMeanings,
  type MeaningKey,
} from '../lib/types';

interface TermRow {
  term: CharterTerm;
  sentence?: string;
  match?: string;
}

const MEANING_LABELS: MeaningKey[] = ['A', 'B', 'C', 'D'];

function withEdits(term: CharterTerm, edits: Record<string, FourMeanings>): CharterTerm {
  const meanings = edits[term.id];
  return meanings ? { ...term, meanings } : term;
}

function windowAround(sentence: string, match: string): string {
  if (sentence.length <= 320) return sentence;
  const at = sentence.toLowerCase().indexOf(match.toLowerCase());
  if (at < 0) return `${sentence.slice(0, 300)}…`;
  const start = Math.max(0, at - 80);
  const end = Math.min(sentence.length, at + match.length + 160);
  return `${start > 0 ? '…' : ''}${sentence.slice(start, end)}${end < sentence.length ? '…' : ''}`;
}

function HighlightedSentence({ sentence, match }: { sentence: string; match: string }) {
  const visible = windowAround(sentence, match);
  const at = visible.toLowerCase().indexOf(match.toLowerCase());
  if (at < 0) return <p className="text-sm leading-relaxed text-muted dark:text-muted-dark">{visible}</p>;
  return (
    <p className="text-sm leading-relaxed text-muted dark:text-muted-dark">
      {visible.slice(0, at)}
      <mark className="rounded bg-accent-soft px-1 font-medium text-ink dark:bg-accent-soft-dark dark:text-ink-dark">
        {visible.slice(at, at + match.length)}
      </mark>
      {visible.slice(at + match.length)}
    </p>
  );
}

function MeaningFields({
  idPrefix,
  meanings,
  onChange,
}: {
  idPrefix: string;
  meanings: FourMeanings;
  onChange: (next: FourMeanings) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {meanings.map((meaning, index) => (
        <TextField
          key={meaning.key}
          id={`${idPrefix}-${meaning.key}`}
          label={`Meaning ${MEANING_LABELS[index]}`}
          value={meaning.text}
          onChange={(text) => {
            const next = meanings.map((item, itemIndex) =>
              itemIndex === index ? { ...item, text } : item,
            ) as FourMeanings;
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}

/** Local draft so a meaning can be cleared and retyped. Saved copies stay intact until all four have text. */
function EditableMeanings({
  term,
  onSave,
}: {
  term: CharterTerm;
  onSave: (meanings: FourMeanings) => void;
}) {
  const [draft, setDraft] = useState(term.meanings);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  return (
    <div className="mt-4 border-t border-line pt-4 dark:border-line-dark">
      <MeaningFields
        idPrefix={`meaning-${term.id}`}
        meanings={draft}
        onChange={(next) => {
          setDraft(next);
          if (next.some((item) => item.text.trim() === '')) {
            setSaved(false);
            setError('All four meanings are required. This edit stays on screen, and the saved meanings stay as they were.');
            return;
          }
          setError('');
          setSaved(true);
          onSave(next);
        }}
      />
      {error ? (
        <p role="alert" className="mt-2 text-sm text-alert-ink dark:text-alert-bright">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted dark:text-muted-dark">
          {saved
            ? 'Saved. These four choices are what the survey will offer.'
            : 'These four choices are what the survey will offer. A change is saved when every box has text.'}
        </p>
      )}
    </div>
  );
}

/** Step 2. Paste a charter, find vague terms, and choose 4 to 6 for the survey. */
export function CharterPage() {
  const navigate = useNavigate();
  const { session, setCharterText, setSelectedTerms, setCustomTerms, setMeaningEdits } = useTeam();
  const booted = useRef(false);
  const [searchedText, setSearchedText] = useState<string | null>(null);
  const [findError, setFindError] = useState('');
  const [fileError, setFileError] = useState('');
  const [limitMessage, setLimitMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [customLabel, setCustomLabel] = useState('');
  const [customMeanings, setCustomMeanings] = useState<FourMeanings>([
    { key: 'A', text: '' },
    { key: 'B', text: '' },
    { key: 'C', text: '' },
    { key: 'D', text: '' },
  ]);
  const [customError, setCustomError] = useState('');

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    if (session.charterText.trim()) setSearchedText(session.charterText);
  }, [session.charterText]);

  const hits: TermHit[] | null = searchedText === null ? null : findVagueTerms(searchedText);
  const stale = searchedText !== null && searchedText !== session.charterText;
  const selectedCount = session.selectedTerms.length;
  const canContinue = selectedCount >= MIN_TERMS && selectedCount <= MAX_TERMS;

  function edited(term: CharterTerm): CharterTerm {
    return term.isCustom ? term : withEdits(term, session.meaningEdits);
  }

  function rows(): TermRow[] {
    const list: TermRow[] = [];
    if (hits && hits.length > 0) {
      for (const hit of hits) {
        list.push({ term: edited(hit.term), sentence: hit.sentence, match: hit.match });
      }
    } else if (hits && hits.length === 0) {
      for (const term of TERM_LIBRARY) list.push({ term: edited(term) });
    }
    for (const id of extraIds) {
      if (list.some((row) => row.term.id === id)) continue;
      const term = libraryTermById(id);
      if (term) list.push({ term: edited(term) });
    }
    for (const custom of session.customTerms) {
      if (!list.some((row) => row.term.id === custom.id)) list.push({ term: custom });
    }
    for (const selected of session.selectedTerms) {
      if (!list.some((row) => row.term.id === selected.id)) list.push({ term: selected });
    }
    return list;
  }

  function findTerms() {
    if (!session.charterText.trim()) {
      setSearchedText(null);
      setFindError('Paste your charter first.');
      return;
    }
    setFindError('');
    setLimitMessage('');
    setSearchedText(session.charterText);
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.txt')) {
      setFileError('Upload a .txt file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result.replace(/^\uFEFF/, '') : '';
      setCharterText(text);
      setSearchedText(text);
      setFileError('');
      setFindError(text.trim() ? '' : 'That file was empty.');
    };
    reader.onerror = () => setFileError('That file could not be read.');
    reader.readAsText(file);
  }

  function toggle(term: CharterTerm, sentence?: string) {
    const already = session.selectedTerms.some((item) => item.id === term.id);
    if (already) {
      setSelectedTerms(session.selectedTerms.filter((item) => item.id !== term.id));
      setLimitMessage('');
      return;
    }
    if (session.selectedTerms.length >= MAX_TERMS) {
      setLimitMessage('You can test up to 6 terms. Deselect one to add another.');
      return;
    }
    const next: CharterTerm = sentence ? { ...term, sourceSentence: sentence } : term;
    setSelectedTerms([...session.selectedTerms, next]);
    setLimitMessage('');
  }

  function saveMeanings(term: CharterTerm, meanings: FourMeanings) {
    if (term.isCustom) {
      setCustomTerms(session.customTerms.map((item) => (item.id === term.id ? { ...item, meanings } : item)));
    } else {
      setMeaningEdits({ ...session.meaningEdits, [term.id]: meanings });
    }
    if (session.selectedTerms.some((item) => item.id === term.id)) {
      setSelectedTerms(
        session.selectedTerms.map((item) => (item.id === term.id ? { ...item, meanings } : item)),
      );
    }
  }

  function addCustom() {
    const label = customLabel.trim();
    const texts = customMeanings.map((meaning) => meaning.text.trim());
    if (!label || texts.some((text) => text === '')) {
      setCustomError('Enter the term and all four meanings.');
      return;
    }
    const libraryHit = TERM_LIBRARY.find((item) => item.label.toLowerCase() === label.toLowerCase());
    if (libraryHit) {
      setExtraIds((current) => (current.includes(libraryHit.id) ? current : [...current, libraryHit.id]));
      setCustomError(`“${libraryHit.label}” is already in the library. Select that card instead.`);
      return;
    }
    if (session.customTerms.some((item) => item.label.toLowerCase() === label.toLowerCase())) {
      setCustomError('That custom term is already on the list.');
      return;
    }
    const created: CharterTerm = {
      id: createId(),
      label,
      synonyms: [label.toLowerCase()],
      meanings: customMeanings.map((meaning) => ({
        key: meaning.key,
        text: meaning.text.trim(),
      })) as FourMeanings,
      rewriteTemplate: customRewriteTemplate(label),
      isCustom: true,
    };
    setCustomTerms([...session.customTerms, created]);
    if (session.selectedTerms.length >= MAX_TERMS) {
      setLimitMessage('The term was added. Deselect one of the six before you can include it.');
    } else {
      setSelectedTerms([...session.selectedTerms, created]);
      setLimitMessage('');
    }
    setCustomLabel('');
    setCustomMeanings([
      { key: 'A', text: '' },
      { key: 'B', text: '' },
      { key: 'C', text: '' },
      { key: 'D', text: '' },
    ]);
    setCustomError('');
  }

  function removeCustom(term: CharterTerm) {
    setCustomTerms(session.customTerms.filter((item) => item.id !== term.id));
    setSelectedTerms(session.selectedTerms.filter((item) => item.id !== term.id));
    if (editingId === term.id) setEditingId(null);
  }

  const visible = rows();
  const showTerms = hits !== null || visible.length > 0;

  return (
    <PageScaffold
      title="Charter"
      description="Paste your team charter, find the vague words, and choose 4 to 6 terms for the Meaning Survey. You can add a term of your own if the list misses one."
    >
      <Callout tone="why">
        A charter only prevents friction when the team means the same thing by its words. “On time” can be four
        different promises. The survey makes those differences visible so you can agree on one.
      </Callout>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          findTerms();
        }}
      >
        <TextField
          id="charter-text"
          label="Team charter"
          rows={10}
          value={session.charterText}
          onChange={setCharterText}
          placeholder="Paste your team charter."
          error={findError}
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit">Find vague terms</Button>
          <div>
            <input
              id="charter-file"
              type="file"
              accept=".txt,text/plain"
              className="sr-only"
              onChange={(event) => {
                onFile(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            <label htmlFor="charter-file" className={cn(buttonClasses('secondary'), 'w-full cursor-pointer sm:w-auto')}>
              Upload .txt
            </label>
          </div>
        </div>
        {fileError ? (
          <p role="alert" className="text-sm text-alert-ink dark:text-alert-bright">
            {fileError}
          </p>
        ) : null}
      </form>

      {showTerms ? (
        <section aria-labelledby="terms-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="terms-heading" className="text-[1.35rem] sm:text-[1.75rem]">
              {hits === null
                ? 'Terms you added'
                : hits.length === 0
                  ? 'Choose from the library'
                  : 'Terms found in your charter'}
            </h2>
            <p aria-live="polite" className="text-sm font-medium text-ink dark:text-ink-dark">
              {selectedCount} of 6 selected
            </p>
          </div>
          {hits === null ? (
            <p className="text-muted dark:text-muted-dark">
              These stay on the list. Find vague terms in the charter to add more from the text.
            </p>
          ) : hits.length === 0 ? (
            <p className="text-muted dark:text-muted-dark">
              No library terms showed up in this charter. Choose 4 to 6 from the full list, or add your own below.
            </p>
          ) : (
            <p className="text-muted dark:text-muted-dark">
              Select 4 to 6. The highlighted word is the phrase that matched.
            </p>
          )}
          {stale ? (
            <p className="text-sm text-warn-ink dark:text-warn-bright">
              The charter text changed. Click Find vague terms again to refresh this list.
            </p>
          ) : null}
          {limitMessage ? (
            <p role="status" className="text-sm text-warn-ink dark:text-warn-bright">
              {limitMessage}
            </p>
          ) : null}
          <ul className="space-y-3">
            {visible.map((row) => {
              const selected = session.selectedTerms.some((item) => item.id === row.term.id);
              const open = editingId === row.term.id;
              return (
                <li
                  key={row.term.id}
                  className="rounded-2xl border border-line bg-card p-4 shadow-sm dark:border-line-dark dark:bg-card-dark"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggle(row.term, row.sentence)}
                      className={cn(
                        'inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-200',
                        focusRing,
                        selected
                          ? 'border-primary bg-primary text-white'
                          : 'border-line bg-paper text-ink hover:border-primary dark:border-line-dark dark:bg-paper-dark dark:text-ink-dark',
                      )}
                    >
                      {selected ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                      {row.term.label}
                      {row.term.isCustom ? <span className="font-normal opacity-80">Custom</span> : null}
                    </button>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-expanded={open}
                        onClick={() => setEditingId(open ? null : row.term.id)}
                      >
                        {open ? 'Close meanings' : 'Edit meanings'}
                      </Button>
                      {row.term.isCustom ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeCustom(row.term)}>
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {row.sentence && row.match ? (
                    <div className="mt-3">
                      <HighlightedSentence sentence={row.sentence} match={row.match} />
                    </div>
                  ) : null}
                  {open ? <EditableMeanings key={row.term.id} term={row.term} onSave={(next) => saveMeanings(row.term, next)} /> : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <form
        className="space-y-4 rounded-2xl border border-line bg-card p-6 shadow-sm dark:border-line-dark dark:bg-card-dark"
        onSubmit={(event) => {
          event.preventDefault();
          addCustom();
        }}
      >
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary dark:text-primary-bright" aria-hidden="true" />
          <h2 className="text-[1.35rem] sm:text-[1.75rem]">Add a custom term</h2>
        </div>
        <p className="text-sm text-muted dark:text-muted-dark">
          Use this when the charter has a vague word the library missed. All four meanings are required.
        </p>
        <TextField
          id="custom-term"
          label="Term"
          value={customLabel}
          onChange={setCustomLabel}
          placeholder="On the same page"
          error={customError}
        />
        <MeaningFields idPrefix="custom" meanings={customMeanings} onChange={setCustomMeanings} />
        <Button type="submit" variant="secondary">
          Add term
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/setup" className={buttonClasses('ghost')}>
          Back
        </Link>
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
          <p id="charter-next-hint" className="text-sm text-muted dark:text-muted-dark">
            {canContinue
              ? `${selectedCount} of 6 selected. You can open the survey.`
              : `Choose ${MIN_TERMS} to ${MAX_TERMS} terms. ${selectedCount} of 6 selected.`}
          </p>
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={!canContinue}
            aria-describedby="charter-next-hint"
            onClick={() => navigate('/survey')}
          >
            Next: Meaning Survey →
          </Button>
        </div>
      </div>
    </PageScaffold>
  );
}
