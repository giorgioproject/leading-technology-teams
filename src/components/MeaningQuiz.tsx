import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { encodeResult, type QuizAnswers } from '../lib/encoding';
import { SCENARIOS, type ScenarioOption } from '../lib/scenarios';
import type { FourMeanings, MeaningKey } from '../lib/types';
import { Button, cn, focusRing } from './Button';

export interface QuizTerm {
  id: string;
  label: string;
  meanings: FourMeanings;
}

interface MeaningQuizProps {
  terms: QuizTerm[];
  /** Skip the name step. Used when the laptop is passed to a known teammate. */
  fixedName?: string;
  /** Names from the quiz link. When present, the first step is a dropdown. */
  names?: string[];
  /** `code` shows the result code. `save` stores the answers and confirms on screen. */
  finish: 'code' | 'save';
  onSave?: (answers: QuizAnswers) => void;
  onClose?: () => void;
}

const OTHER_NAME = '__other__';
const REFLECTION =
  'Interesting: people often interpret “on time” in 4 different ways. You’ll see how your team compares.';

type Stage =
  | { kind: 'name' }
  | { kind: 'term'; index: number }
  | { kind: 'scenario'; index: number }
  | { kind: 'optional' }
  | { kind: 'code'; code: string; copyError: string }
  | { kind: 'saved' };

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Stable shuffle so the cards stay put while this person answers, and differ between people. */
function shuffleKeys(seed: number): MeaningKey[] {
  const keys: MeaningKey[] = ['A', 'B', 'C', 'D'];
  let state = seed || 1;
  for (let index = keys.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swap = state % (index + 1);
    const current = keys[index];
    const other = keys[swap];
    if (current === undefined || other === undefined) continue;
    keys[index] = other;
    keys[swap] = current;
  }
  return keys;
}

function ChoiceCards({
  options,
  selected,
  onSelect,
}: {
  options: Array<{ key: MeaningKey; text: string }>;
  selected: MeaningKey | undefined;
  onSelect: (key: MeaningKey) => void;
}) {
  return (
    <ul className="space-y-3">
      {options.map((option) => {
        const pressed = selected === option.key;
        return (
          <li key={option.key}>
            <button
              type="button"
              aria-pressed={pressed}
              onClick={() => onSelect(option.key)}
              className={cn(
                'flex min-h-[4.5rem] w-full items-start gap-3 rounded-2xl border px-4 py-4 text-left text-base leading-relaxed transition-colors duration-200',
                focusRing,
                pressed
                  ? 'border-primary bg-primary-soft text-ink dark:border-primary-bright dark:bg-primary-soft-dark dark:text-ink-dark'
                  : 'border-line bg-card text-ink hover:border-primary dark:border-line-dark dark:bg-card-dark dark:text-ink-dark',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                  pressed
                    ? 'border-primary bg-primary text-white'
                    : 'border-line dark:border-line-dark',
                )}
                aria-hidden="true"
              >
                {pressed ? <Check className="h-3.5 w-3.5" /> : null}
              </span>
              <span>{option.text}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function RatingSlider({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (next: number | undefined) => void;
}) {
  const answered = value !== undefined;
  return (
    <fieldset className="space-y-3 rounded-2xl border border-line bg-card p-4 dark:border-line-dark dark:bg-card-dark">
      <legend className="px-1 text-base font-medium text-ink dark:text-ink-dark">{label}</legend>
      <p id={`${id}-hint`} className="text-sm text-muted dark:text-muted-dark">
        Optional. 1 is low and 5 is high. Leave it unanswered if you would rather skip it.
      </p>
      <input
        id={id}
        type="range"
        min={1}
        max={5}
        step={1}
        value={value ?? 3}
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={answered ? value : undefined}
        aria-valuetext={answered ? `${value} of 5` : 'Not answered'}
        aria-describedby={`${id}-hint`}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-primary"
      />
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted dark:text-muted-dark">{answered ? `${value} of 5` : 'Not answered'}</span>
        {answered ? (
          <button
            type="button"
            className={cn('min-h-11 rounded-xl px-3 text-sm font-medium text-ink dark:text-ink-dark', focusRing)}
            onClick={() => onChange(undefined)}
          >
            Clear
          </button>
        ) : null}
      </div>
    </fieldset>
  );
}

/** One person, one question at a time: charter meanings, three scenarios, then optional ratings. */
export function MeaningQuiz({ terms, fixedName, names = [], finish, onSave, onClose }: MeaningQuizProps) {
  const namedList = names.map((name) => name.trim()).filter((name) => name !== '');
  const [stage, setStage] = useState<Stage>(fixedName ? { kind: 'term', index: 0 } : { kind: 'name' });
  const [pickedName, setPickedName] = useState('');
  const [otherName, setOtherName] = useState('');
  const [usingOther, setUsingOther] = useState(namedList.length === 0);
  const [nameError, setNameError] = useState('');
  const [orderName, setOrderName] = useState(fixedName?.trim() ?? '');
  const [choices, setChoices] = useState<Record<string, MeaningKey>>({});
  const [scenarioChoices, setScenarioChoices] = useState<Array<MeaningKey | undefined>>([
    undefined,
    undefined,
    undefined,
  ]);
  const [selfRating, setSelfRating] = useState<number | undefined>(undefined);
  const [comfort, setComfort] = useState<number | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  const orders = useMemo(() => {
    const map = new Map<string, MeaningKey[]>();
    const seedName = orderName || 'teammate';
    for (const term of terms) map.set(term.id, shuffleKeys(hashString(`${seedName}|${term.id}`)));
    for (const scenario of SCENARIOS) map.set(scenario.id, shuffleKeys(hashString(`${seedName}|${scenario.id}`)));
    return map;
  }, [orderName, terms]);

  const total = terms.length + SCENARIOS.length;
  const progressIndex =
    stage.kind === 'term'
      ? stage.index
      : stage.kind === 'scenario'
        ? terms.length + stage.index
        : stage.kind === 'name'
          ? 0
          : total;
  const progressLabel =
    stage.kind === 'term'
      ? `Term ${stage.index + 1} of ${terms.length}`
      : stage.kind === 'scenario'
        ? `Scenario ${stage.index + 1} of ${SCENARIOS.length}`
        : stage.kind === 'optional'
          ? 'Optional ratings'
          : stage.kind === 'name'
            ? 'Your name'
            : 'Done';

  function resolvedName(): string {
    if (fixedName) return fixedName.trim();
    if (usingOther || namedList.length === 0) return otherName.trim();
    return pickedName.trim();
  }

  function start() {
    const name = resolvedName();
    if (!fixedName && namedList.length > 0 && !usingOther && !pickedName) {
      setNameError('Choose your name to start.');
      return;
    }
    if (!name) {
      setNameError('Enter your name to start.');
      return;
    }
    setNameError('');
    setOrderName(name);
    setChoices({});
    setScenarioChoices([undefined, undefined, undefined]);
    setStage({ kind: 'term', index: 0 });
  }

  function selectTerm(termId: string, key: MeaningKey) {
    setChoices((current) => ({ ...current, [termId]: key }));
  }

  function selectScenario(index: number, key: MeaningKey) {
    setScenarioChoices((current) => current.map((item, itemIndex) => (itemIndex === index ? key : item)));
  }

  function goBack() {
    if (stage.kind === 'term') {
      if (stage.index === 0) {
        if (!fixedName) setStage({ kind: 'name' });
        return;
      }
      setStage({ kind: 'term', index: stage.index - 1 });
      return;
    }
    if (stage.kind === 'scenario') {
      if (stage.index === 0) setStage({ kind: 'term', index: terms.length - 1 });
      else setStage({ kind: 'scenario', index: stage.index - 1 });
      return;
    }
    if (stage.kind === 'optional') {
      setStage({ kind: 'scenario', index: SCENARIOS.length - 1 });
    }
  }

  function goForward() {
    if (stage.kind === 'term') {
      const term = terms[stage.index];
      if (!term || !choices[term.id]) return;
      if (stage.index + 1 < terms.length) setStage({ kind: 'term', index: stage.index + 1 });
      else setStage({ kind: 'scenario', index: 0 });
      return;
    }
    if (stage.kind === 'scenario') {
      if (!scenarioChoices[stage.index]) return;
      if (stage.index + 1 < SCENARIOS.length) setStage({ kind: 'scenario', index: stage.index + 1 });
      else setStage({ kind: 'optional' });
    }
  }

  function finishQuiz() {
    const name = resolvedName();
    const first = scenarioChoices[0];
    const second = scenarioChoices[1];
    const third = scenarioChoices[2];
    if (!name || !first || !second || !third) return;
    if (terms.some((term) => !choices[term.id])) return;
    const answers: QuizAnswers = {
      name,
      meanings: choices,
      scenarios: [first, second, third],
    };
    if (selfRating !== undefined) answers.selfRating = selfRating;
    if (comfort !== undefined) answers.comfort = comfort;
    if (finish === 'save') {
      onSave?.(answers);
      setStage({ kind: 'saved' });
      return;
    }
    const encoded = encodeResult(answers);
    setStage(
      encoded.ok
        ? { kind: 'code', code: encoded.value, copyError: '' }
        : { kind: 'code', code: '', copyError: encoded.error },
    );
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
      const field = document.getElementById('result-code');
      if (field instanceof HTMLTextAreaElement) field.select();
      setStage((current) =>
        current.kind === 'code'
          ? { ...current, copyError: 'Copy did not work. Select the code and copy it yourself.' }
          : current,
      );
    }
  }

  function orderedMeanings(termId: string, meanings: FourMeanings | readonly ScenarioOption[]) {
    const order = orders.get(termId) ?? (['A', 'B', 'C', 'D'] as MeaningKey[]);
    return order.flatMap((key) => {
      const found = meanings.find((item) => item.key === key);
      return found ? [found] : [];
    });
  }

  if (stage.kind === 'name') {
    return (
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          start();
        }}
      >
        <h2 className="text-[1.35rem] sm:text-[1.75rem]">Your name</h2>
        {namedList.length > 0 ? (
          <div>
            <label htmlFor="quiz-name" className="text-sm font-medium text-ink dark:text-ink-dark">
              Choose your name
            </label>
            <select
              id="quiz-name"
              value={usingOther ? OTHER_NAME : pickedName}
              onChange={(event) => {
                const next = event.target.value;
                setUsingOther(next === OTHER_NAME);
                if (next !== OTHER_NAME) setPickedName(next);
              }}
              className={cn(
                'mt-1.5 min-h-11 w-full rounded-xl border border-line bg-card px-3 text-base text-ink dark:border-line-dark dark:bg-card-dark dark:text-ink-dark',
                focusRing,
              )}
            >
              <option value="">Choose your name</option>
              {namedList.map((name, index) => (
                <option key={`${name}-${index}`} value={name}>
                  {name}
                </option>
              ))}
              <option value={OTHER_NAME}>My name is not listed</option>
            </select>
          </div>
        ) : null}
        {usingOther || namedList.length === 0 ? (
          <div>
            <label htmlFor="quiz-other-name" className="text-sm font-medium text-ink dark:text-ink-dark">
              Your name
            </label>
            <input
              id="quiz-other-name"
              value={otherName}
              onChange={(event) => setOtherName(event.target.value)}
              autoComplete="name"
              className={cn(
                'mt-1.5 min-h-11 w-full rounded-xl border border-line bg-card px-3 text-base text-ink dark:border-line-dark dark:bg-card-dark dark:text-ink-dark',
                focusRing,
              )}
            />
          </div>
        ) : null}
        {nameError ? (
          <p role="alert" className="text-sm text-alert-ink dark:text-alert-bright">
            {nameError}
          </p>
        ) : null}
        <Button type="submit">Start</Button>
      </form>
    );
  }

  if (stage.kind === 'code') {
    const who = resolvedName();
    return (
      <section className="space-y-4" aria-labelledby="quiz-done-title">
        <h2 id="quiz-done-title" className="text-[1.35rem] sm:text-[1.75rem]">
          Send this code to your team leader.
        </h2>
        <p className="text-muted dark:text-muted-dark">
          {who ? `${who}, this code is your whole quiz. ` : ''}
          {REFLECTION}
        </p>
        {stage.code ? (
          <>
            <label htmlFor="result-code" className="text-sm font-medium text-ink dark:text-ink-dark">
              Result code
            </label>
            <textarea
              id="result-code"
              readOnly
              rows={4}
              value={stage.code}
              className="w-full resize-y rounded-2xl border border-line bg-paper px-4 py-4 font-mono text-sm leading-relaxed text-ink dark:border-line-dark dark:bg-paper-dark dark:text-ink-dark"
              onFocus={(event) => event.currentTarget.select()}
            />
            <Button type="button" onClick={() => void copyCode(stage.code)}>
              {copied ? 'Copied' : 'Copy code'}
            </Button>
          </>
        ) : null}
        {stage.copyError ? (
          <p role="alert" className="text-sm text-alert-ink dark:text-alert-bright">
            {stage.copyError}
          </p>
        ) : copied ? (
          <p role="status" className="text-sm text-good-ink dark:text-good-bright">
            Copied. Paste it back to your team leader.
          </p>
        ) : null}
      </section>
    );
  }

  if (stage.kind === 'saved') {
    return (
      <section className="space-y-4" aria-labelledby="quiz-saved-title">
        <h2 id="quiz-saved-title" className="text-[1.35rem] sm:text-[1.75rem]">
          {resolvedName()}’s answers are saved.
        </h2>
        <p className="text-muted dark:text-muted-dark">
          Close this before the next person looks. {REFLECTION}
        </p>
        {onClose ? (
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        ) : null}
      </section>
    );
  }

  const currentTerm = stage.kind === 'term' ? terms[stage.index] : undefined;
  const currentScenario = stage.kind === 'scenario' ? SCENARIOS[stage.index] : undefined;
  const currentChoice =
    currentTerm !== undefined
      ? choices[currentTerm.id]
      : currentScenario !== undefined
        ? scenarioChoices[stage.kind === 'scenario' ? stage.index : -1]
        : undefined;

  return (
    <div className="space-y-5">
      <div>
        <p className="label mb-2">{progressLabel}</p>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-line dark:bg-line-dark"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={progressIndex}
          aria-valuetext={progressLabel}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${total === 0 ? 0 : (progressIndex / total) * 100}%` }}
          />
        </div>
      </div>

      {currentTerm ? (
        <section className="space-y-4" aria-labelledby="quiz-question">
          <h2 id="quiz-question" className="text-[1.35rem] leading-snug sm:text-[1.75rem]">
            When your team charter says <strong>‘{currentTerm.label}’</strong>, what does it mean to you?
          </h2>
          <ChoiceCards
            options={orderedMeanings(currentTerm.id, currentTerm.meanings)}
            selected={choices[currentTerm.id]}
            onSelect={(key) => selectTerm(currentTerm.id, key)}
          />
        </section>
      ) : null}

      {currentScenario && stage.kind === 'scenario' ? (
        <section className="space-y-4" aria-labelledby="quiz-question">
          <p className="label">Part 2 · Scenarios</p>
          <h2 id="quiz-question" className="text-[1.35rem] leading-snug sm:text-[1.75rem]">
            {currentScenario.prompt}
          </h2>
          <ChoiceCards
            options={orderedMeanings(currentScenario.id, currentScenario.options)}
            selected={scenarioChoices[stage.index]}
            onSelect={(key) => selectScenario(stage.index, key)}
          />
        </section>
      ) : null}

      {stage.kind === 'optional' ? (
        <section className="space-y-4" aria-labelledby="quiz-optional">
          <h2 id="quiz-optional" className="text-[1.35rem] sm:text-[1.75rem]">
            Two optional ratings
          </h2>
          <p className="text-muted dark:text-muted-dark">
            Move a slider to answer it. The comfort rating is only ever shown for the whole team, never next to
            your name.
          </p>
          <RatingSlider
            id="self-rating"
            label="How much do you feel you contributed in our last meeting?"
            value={selfRating}
            onChange={setSelfRating}
          />
          <RatingSlider
            id="comfort-rating"
            label="How comfortable do you feel sharing ideas in this team?"
            value={comfort}
            onChange={setComfort}
          />
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={goBack}>
          Back
        </Button>
        {stage.kind === 'optional' ? (
          <Button type="button" onClick={finishQuiz}>
            Finish
          </Button>
        ) : (
          <Button type="button" disabled={!currentChoice} onClick={goForward}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
