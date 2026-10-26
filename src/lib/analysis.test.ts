import { describe, expect, it } from 'vitest';
import {
  STOPWORDS,
  alignmentBand,
  analyze,
  contentWords,
  hasBuildPhrase,
  shannonBalance,
} from './analysis';
import type { CharterTerm, MeaningKey, Member, SurveyResponse, Turn } from './types';
import { libraryTermById } from './termLibrary';

const members: Member[] = [
  { id: 'sara', name: 'Sara' },
  { id: 'marco', name: 'Marco' },
  { id: 'lena', name: 'Lena' },
  { id: 'david', name: 'David' },
];

function turn(index: number, speaker: string, text: string, extra?: Partial<Turn>): Turn {
  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  return { index, speaker, text, wordCount, ...extra };
}

function response(
  memberId: string,
  meanings: Record<string, MeaningKey>,
  scenarios: [MeaningKey, MeaningKey, MeaningKey],
): SurveyResponse {
  const member = members.find((item) => item.id === memberId);
  return {
    memberId,
    memberName: member?.name ?? memberId,
    meanings,
    scenarios,
  };
}

function termOrThrow(id: string): CharterTerm {
  const term = libraryTermById(id);
  if (!term) throw new Error(id);
  return term;
}

describe('content words', () => {
  it('keeps a stopword list of at least 150 words, including the fillers', () => {
    expect(STOPWORDS.size).toBeGreaterThanOrEqual(150);
    for (const filler of ['yeah', 'like', 'okay', 'um', 'uh', 'so', 'just', 'really', 'think', 'know', 'mean', 'gonna', 'kinda']) {
      expect(STOPWORDS.has(filler)).toBe(true);
    }
  });

  it('drops short words and stopwords, then stems', () => {
    const words = contentWords('Yeah I really think we should survey local businesses.');
    expect(words.map((word) => word.stem)).toEqual(['survey', 'local', 'business']);
    expect(words.map((word) => word.display)).toEqual(['survey', 'local', 'businesses']);
  });
});

describe('participation balance', () => {
  it('scores an even split at 100 and a monopoly near 0', () => {
    expect(shannonBalance([10, 10, 10, 10])).toBeCloseTo(100, 5);
    expect(shannonBalance([40, 0, 0, 0])).toBeCloseTo(0, 5);
    expect(shannonBalance([10])).toBeNull();
  });

  it('marks dominant and quiet members against an equal share', () => {
    const turns = [
      turn(0, 'Marco', 'one two three four five six seven eight'),
      turn(1, 'Sara', 'one two'),
      turn(2, 'Lena', 'one'),
    ];
    const result = analyze({
      members: members.slice(0, 3),
      terms: [],
      responses: [],
      turns,
      speakerMap: { Marco: 'marco', Sara: 'sara', Lena: 'lena' },
    });
    const marco = result.participation.members.find((row) => row.memberId === 'marco');
    const lena = result.participation.members.find((row) => row.memberId === 'lena');
    expect(marco?.dominant).toBe(true);
    expect(lena?.quiet).toBe(true);
    expect(result.participation.label).toBe('Uneven');
  });
});

describe('idea uptake', () => {
  it('ignores words that were already used in the previous turns', () => {
    const turns = [
      turn(0, 'Sara', 'Please review the survey design before Friday so the draft is ready.'),
      turn(1, 'David', 'Sounds good.'),
      turn(2, 'Marco', 'The survey design needs a clearer sample.'),
      turn(3, 'Lena', 'I like the survey design.'),
    ];
    const result = analyze({
      members,
      terms: [],
      responses: [],
      turns,
      speakerMap: { Sara: 'sara', Marco: 'marco', Lena: 'lena', David: 'david' },
    });
    const marco = result.uptake.members.find((row) => row.memberId === 'marco');
    const sara = result.uptake.members.find((row) => row.memberId === 'sara');
    expect(marco?.ideasPickedUp).toBe(0);
    expect(sara?.ideasPickedUp).toBe(1);
  });

  it('picks a turn up once, and credits every person who built on it', () => {
    const turns = [
      turn(0, 'Lena', 'We should survey local business owners before we lock our topic.'),
      turn(1, 'Sara', "Building on Lena's point, a survey of local business owners can ground the project."),
      turn(2, 'Marco', 'A survey of local business owners could be our first milestone.'),
      turn(3, 'David', 'I can print the handout.'),
    ];
    const result = analyze({
      members,
      terms: [],
      responses: [],
      turns,
      speakerMap: { Lena: 'lena', Sara: 'sara', Marco: 'marco', David: 'david' },
    });
    const lena = result.uptake.members.find((row) => row.memberId === 'lena');
    const sara = result.uptake.members.find((row) => row.memberId === 'sara');
    const marco = result.uptake.members.find((row) => row.memberId === 'marco');
    expect(lena?.ideasPickedUp).toBe(1);
    expect(lena?.substantiveTurns).toBe(1);
    expect(lena?.uptakeRate).toBe(1);
    expect(sara?.builtOnOthers).toBe(1);
    expect(marco?.builtOnOthers).toBe(1);
    expect(lena?.examples).toHaveLength(2);
    expect(lena?.examples[0]?.phrase).toContain('survey');
    expect(lena?.examples[0]?.targetName).toBe('Sara');
  });

  it('counts a build phrase only when it follows directly', () => {
    expect(hasBuildPhrase("Building on Marco's point, we should start.", 'Marco')).toBe(true);
    expect(hasBuildPhrase('Good point, and I agree with Sara.', 'Sara')).toBe(true);
    expect(hasBuildPhrase('+1', 'Sara')).toBe(true);
    const turns = [
      turn(0, 'Marco', 'We need a parking permit and a vendor invoice before the fair.'),
      turn(1, 'David', 'Sounds good.'),
      turn(2, 'Sara', 'Building on Marco, we can wait until Monday.'),
    ];
    const result = analyze({
      members,
      terms: [],
      responses: [],
      turns,
      speakerMap: { Marco: 'marco', David: 'david', Sara: 'sara' },
    });
    const marco = result.uptake.members.find((row) => row.memberId === 'marco');
    expect(marco?.ideasPickedUp).toBe(0);
  });
});

describe('questions and interruptions', () => {
  it('marks a question unanswered only when no other member speaks in the next two turns', () => {
    const turns = [
      turn(0, 'David', 'What day is the draft due?'),
      turn(1, 'Sara', 'Friday.'),
      turn(2, 'David', 'Should we ask the professor about the rubric?'),
      turn(3, 'David', 'And who brings the copies?'),
    ];
    const result = analyze({
      members,
      terms: [],
      responses: [],
      turns,
      speakerMap: { David: 'david', Sara: 'sara' },
    });
    expect(result.unanswered.map((item) => item.text)).toEqual([
      'Should we ask the professor about the rubric?',
      'And who brings the copies?',
    ]);
  });

  it('flags timestamp overlaps and a trailing dash as approximate', () => {
    const turns = [
      turn(0, 'Marco', 'I keep circling the night before—'),
      turn(1, 'Sara', 'I want a decision before we leave.', { startSec: 8, endSec: 12 }),
      turn(2, 'Lena', 'Then we should vote.', { startSec: 11, endSec: 14 }),
    ];
    const result = analyze({
      members,
      terms: [],
      responses: [],
      turns,
      speakerMap: { Marco: 'marco', Sara: 'sara', Lena: 'lena' },
    });
    expect(result.interruptions.map((item) => item.kind)).toEqual(['cutoff', 'overlap']);
  });
});

describe('meaning alignment', () => {
  it('badges agreement and sorts misaligned terms first', () => {
    expect(alignmentBand(0.75)).toBe('aligned');
    expect(alignmentBand(0.5)).toBe('partly');
    expect(alignmentBand(0.49)).toBe('misaligned');

    const onTime = termOrThrow('on-time');
    const quality = termOrThrow('quality-work');
    const communication = termOrThrow('communication');
    const responses = [
      response('sara', { 'on-time': 'A', 'quality-work': 'C', communication: 'A' }, ['A', 'A', 'A']),
      response('marco', { 'on-time': 'B', 'quality-work': 'C', communication: 'A' }, ['B', 'A', 'A']),
      response('lena', { 'on-time': 'C', 'quality-work': 'C', communication: 'B' }, ['C', 'C', 'A']),
      response('david', { 'on-time': 'D', 'quality-work': 'A', communication: 'D' }, ['D', 'D', 'A']),
    ];
    const result = analyze({
      members,
      terms: [quality, communication, onTime],
      responses,
      turns: [],
      speakerMap: {},
    });
    expect(result.terms.map((term) => term.termId)).toEqual(['on-time', 'communication', 'quality-work']);
    expect(result.terms.map((term) => term.status)).toEqual(['misaligned', 'partly', 'aligned']);
    expect(result.sharedMeaning).toBeCloseTo(((0.25 + 0.5 + 0.75) / 3) * 100, 5);
    const onTimeRow = result.terms[0];
    expect(onTimeRow?.rewrite).toContain('No meaning was chosen more often than the others');
    for (const meaning of onTime.meanings) {
      expect(onTimeRow?.rewrite).toContain(meaning.text);
    }
    expect(result.terms.find((term) => term.termId === 'quality-work')?.rewrite).toBeNull();
    expect(result.terms.find((term) => term.termId === 'quality-work')?.majorityText).toContain('rubric');
  });

  it('writes both meanings when exactly two are tied, and keeps the template', () => {
    const done = termOrThrow('done');
    const responses = [
      response('sara', { done: 'A' }, ['A', 'A', 'A']),
      response('marco', { done: 'A' }, ['A', 'A', 'A']),
      response('lena', { done: 'B' }, ['A', 'A', 'A']),
      response('david', { done: 'B' }, ['A', 'A', 'A']),
    ];
    const result = analyze({ members, terms: [done], responses, turns: [], speakerMap: {} });
    const rewrite = result.terms[0]?.rewrite ?? '';
    expect(rewrite).toContain(done.meanings[0].text);
    expect(rewrite).toContain(` or ${done.meanings[1].text}`);
    expect(rewrite).toContain('On our team, "Done" means:');
    expect(rewrite).not.toContain(done.meanings[2].text);
  });

  it('describes a scenario split and stays quiet when one option has 75%', () => {
    const meanings: Record<string, MeaningKey> = {};
    const responses = [
      response('sara', meanings, ['A', 'A', 'A']),
      response('marco', meanings, ['B', 'A', 'A']),
      response('lena', meanings, ['C', 'A', 'C']),
      response('david', meanings, ['D', 'C', 'D']),
    ];
    const result = analyze({ members, terms: [], responses, turns: [], speakerMap: {} });
    const decision = result.scenarios[0];
    const conflict = result.scenarios[1];
    expect(decision?.split).toBe(true);
    expect(decision?.note).toContain('Two of you prefer to decide fast');
    expect(decision?.note).toContain('discuss for 10 minutes, then vote');
    expect(conflict?.split).toBe(false);
    expect(conflict?.note).toBeNull();
  });
});

describe('speaker mapping', () => {
  it('drops ignored speakers and reports names that are still unmatched', () => {
    const turns = [
      turn(0, 'Sara', 'Hello team, shall we start the check in now?'),
      turn(1, 'Prof. Lee', 'I will listen.'),
      turn(2, 'Guest', 'I have a question about the room?'),
    ];
    const result = analyze({
      members,
      terms: [],
      responses: [],
      turns,
      speakerMap: { Sara: 'sara', 'Prof. Lee': 'ignore' },
    });
    expect(result.turns.map((item) => item.name)).toEqual(['Sara']);
    expect(result.unmappedSpeakers).toEqual(['Guest']);
    expect(result.unanswered).toHaveLength(1);
  });
});
