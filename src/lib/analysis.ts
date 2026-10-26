/**
 * Scores one meeting: who spoke, whose ideas were picked up, which questions
 * went unanswered, and where the team means different things by the same word.
 * Thresholds live at the top so a later pass can tune them without hunting
 * through the rules.
 */

import { SCENARIOS } from './scenarios';
import { parseTranscript } from './transcriptParser';
import {
  IGNORE_SPEAKER,
  MEANING_KEYS,
  type CharterTerm,
  type MeaningKey,
  type Member,
  type SurveyResponse,
  type TeamSession,
  type Turn,
} from './types';

/** Word share above 1.5× an equal split. */
export const DOMINANT_SHARE_MULTIPLIER = 1.5;
/** Word share below half of an equal split. */
export const QUIET_SHARE_MULTIPLIER = 0.5;
export const BALANCE_BALANCED_MIN = 85;
export const BALANCE_SOMEWHAT_MIN = 70;

/** How many later turns, by other people, can still pick an idea up. */
export const UPTAKE_LATER_TURNS = 6;
/** Words already used this recently are not "introduced" by the current turn. */
export const UPTAKE_PRIOR_TURNS = 5;
export const UPTAKE_SHARED_WORDS = 2;
export const CONTENT_WORD_MIN_LETTERS = 4;
/** A turn counts toward the uptake rate only when it has at least this many content words. */
export const SUBSTANTIVE_CONTENT_WORDS = 5;
/** A member counts toward the spread when at least this fraction of substantive turns was picked up. */
export const UPTAKE_SPREAD_MIN_RATE = 0.2;

export const QUESTION_LOOKAHEAD = 2;
export const ALIGNED_MIN_AGREEMENT = 0.75;
export const PARTLY_MIN_AGREEMENT = 0.5;
/** A scenario is a split when no single option reaches this share. */
export const SCENARIO_MAJORITY = 0.75;

export type BalanceLabel = 'Balanced' | 'Somewhat uneven' | 'Uneven';
export type AlignmentBand = 'aligned' | 'partly' | 'misaligned';

const FILLERS = [
  'yeah', 'yes', 'okay', 'ok', 'um', 'uh', 'so', 'just', 'really', 'think', 'know', 'mean',
  'gonna', 'kinda', 'like', 'well', 'right', 'actually', 'basically', 'literally',
];

const FUNCTION_WORDS = [
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but',
  'by', 'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for',
  'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself',
  'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'me',
  'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
  'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'some',
  'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
  'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why',
  'will', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves', 'let',
  'im', 'ive', 'id', 'youre', 'youve', 'theyre', 'weve', 'dont', 'doesnt', 'didnt', 'cant',
  'couldnt', 'wont', 'wouldnt', 'shouldnt', 'isnt', 'arent', 'wasnt', 'werent', 'havent',
  'hasnt', 'hadnt', 'thats', 'theres', 'whats', 'heres', 'also', 'back', 'even', 'still',
  'already', 'another', 'something', 'anything', 'everything', 'nothing', 'someone',
  'anyone', 'everyone', 'said', 'say', 'says', 'saying', 'thing', 'things', 'stuff', 'got',
  'get', 'getting', 'go', 'going', 'went', 'come', 'coming', 'want', 'wanted', 'need',
  'needs', 'needed', 'make', 'makes', 'made', 'lot', 'lots', 'much', 'many', 'hey', 'hi',
  'hello', 'thanks', 'thank', 'please', 'maybe', 'sorry', 'just', 'really',
];

export const STOPWORDS: ReadonlySet<string> = new Set([...FUNCTION_WORDS, ...FILLERS]);

const QUESTION_STARTS = new Set([
  'what', 'why', 'how', 'when', 'who', 'should', 'could', 'can', 'do', 'does', 'is', 'are', 'would',
]);

export interface ContentWord {
  stem: string;
  /** The word as it was spoken, without punctuation, for the report examples. */
  display: string;
}

export interface AnalyzedTurn {
  index: number;
  memberId: string;
  name: string;
  text: string;
  wordCount: number;
  startSec?: number;
  endSec?: number;
}

export interface MemberSpeech {
  memberId: string;
  name: string;
  words: number;
  turns: number;
  wordShare: number;
  turnShare: number;
  dominant: boolean;
  quiet: boolean;
}

export interface ParticipationResult {
  members: MemberSpeech[];
  totalWords: number;
  totalTurns: number;
  /** 0–100. Null when fewer than two people spoke, or nobody spoke. */
  balance: number | null;
  label: BalanceLabel | null;
  /** 1 / n. The dashed line on the chart. */
  equalShare: number;
}

export interface UptakeExample {
  sourceMemberId: string;
  sourceTurnIndex: number;
  targetMemberId: string;
  targetName: string;
  phrase: string;
}

export interface MemberUptake {
  memberId: string;
  name: string;
  ideasPickedUp: number;
  builtOnOthers: number;
  substantiveTurns: number;
  /** ideasPickedUp / substantiveTurns, or 0 when they had no substantive turn. */
  uptakeRate: number;
  examples: UptakeExample[];
}

export interface UptakeResult {
  members: MemberUptake[];
  /** Members whose uptake rate is at least UPTAKE_SPREAD_MIN_RATE. */
  spreadCount: number;
  memberCount: number;
}

export interface QuestionItem {
  memberId: string;
  name: string;
  text: string;
  turnIndex: number;
}

export interface InterruptionItem {
  /** The person who was cut off. */
  fromMemberId: string;
  fromName: string;
  byMemberId: string;
  byName: string;
  kind: 'overlap' | 'cutoff';
}

export interface MeaningSegment {
  key: MeaningKey;
  text: string;
  memberIds: string[];
}

export interface TermAlignment {
  termId: string;
  label: string;
  status: AlignmentBand;
  agreement: number;
  respondents: number;
  segments: MeaningSegment[];
  sourceSentence?: string;
  /** Filled for partly aligned and misaligned terms. */
  rewrite: string | null;
  /** Set when one meaning was chosen by more than half the respondents. */
  majorityKey: MeaningKey | null;
  majorityText: string | null;
}

export interface ScenarioChoice {
  memberId: string;
  name: string;
  key: MeaningKey;
  text: string;
}

export interface ScenarioAlignment {
  scenarioId: string;
  dimension: string;
  prompt: string;
  choices: ScenarioChoice[];
  split: boolean;
  /** Set when the team does not share a style. */
  note: string | null;
}

export interface TeamAnalysis {
  members: Member[];
  turns: AnalyzedTurn[];
  /** Speakers still waiting for a teammate or Ignore. */
  unmappedSpeakers: string[];
  parseError: string | null;
  participation: ParticipationResult;
  uptake: UptakeResult;
  unanswered: QuestionItem[];
  interruptions: InterruptionItem[];
  terms: TermAlignment[];
  /** Mean agreement × 100. Null when no term has answers. */
  sharedMeaning: number | null;
  scenarios: ScenarioAlignment[];
}

export function balanceLabel(score: number): BalanceLabel {
  if (score >= BALANCE_BALANCED_MIN) return 'Balanced';
  if (score >= BALANCE_SOMEWHAT_MIN) return 'Somewhat uneven';
  return 'Uneven';
}

export function alignmentBand(agreement: number): AlignmentBand {
  if (agreement >= ALIGNED_MIN_AGREEMENT) return 'aligned';
  if (agreement >= PARTLY_MIN_AGREEMENT) return 'partly';
  return 'misaligned';
}

/** Shannon evenness of the shares, 0–100. A zero share adds nothing to the sum. */
export function shannonBalance(shares: number[]): number | null {
  if (shares.length < 2) return null;
  const total = shares.reduce((sum, share) => sum + share, 0);
  if (total <= 0) return null;
  let entropy = 0;
  for (const share of shares) {
    if (share <= 0) continue;
    const p = share / total;
    entropy -= p * Math.log(p);
  }
  return (entropy / Math.log(shares.length)) * 100;
}

function stemWord(word: string): string {
  if (word.endsWith('ing') && word.length > 3) return word.slice(0, -3);
  if (word.endsWith('ed') && word.length > 2) return word.slice(0, -2);
  if (word.endsWith('es') && word.length > 2) return word.slice(0, -2);
  if (word.endsWith('s') && word.length > 1) return word.slice(0, -1);
  return word;
}

/** Content words: lowercase, punctuation stripped, stopwords removed, then lightly stemmed. */
export function contentWords(text: string): ContentWord[] {
  const raw = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
  const words: ContentWord[] = [];
  for (const token of raw) {
    if (token.length < CONTENT_WORD_MIN_LETTERS) continue;
    if (STOPWORDS.has(token)) continue;
    words.push({ display: token, stem: stemWord(token) });
  }
  return words;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
}

/** True when the next turn explicitly picks up what the previous person said. */
export function hasBuildPhrase(text: string, speakerName: string): boolean {
  const normalized = text.toLowerCase().replace(/[’‘]/g, "'");
  if (
    normalized.includes('building on') ||
    normalized.includes('build on') ||
    normalized.includes('to add to') ||
    normalized.includes('good point') ||
    normalized.includes("that's a good idea") ||
    normalized.includes('+1')
  ) {
    return true;
  }
  const name = firstName(speakerName);
  if (!name) return false;
  if (
    normalized.includes(`like ${name} said`) ||
    normalized.includes(`as ${name} said`) ||
    normalized.includes(`i agree with ${name}`) ||
    normalized.includes(`going back to what ${name}`)
  ) {
    return true;
  }
  return new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i').test(normalized);
}

function isQuestion(text: string): boolean {
  if (text.includes('?')) return true;
  const match = text.trim().toLowerCase().match(/[a-z]+/);
  return match !== null && QUESTION_STARTS.has(match[0] ?? '');
}

function meaningText(term: CharterTerm, key: MeaningKey): string {
  return term.meanings.find((meaning) => meaning.key === key)?.text ?? key;
}

function fillRewrite(template: string, chosen: string[]): string {
  const phrase = chosen.join(' or ');
  if (template.includes('{chosen meaning}')) return template.split('{chosen meaning}').join(phrase);
  return `${template} ${phrase}`;
}

/**
 * A two-way tie fills the charter template with both meanings.
 * A wider tie is not collapsed to the first two, or the report would invent a favorite.
 */
function rewriteLine(template: string, chosen: string[]): string {
  if (chosen.length > 2) {
    return `No meaning was chosen more often than the others. The answers were: ${chosen.join('; ')}. Pick one, then fill in the concrete line.`;
  }
  return fillRewrite(template, chosen);
}

function peopleCount(count: number): string {
  if (count === 1) return 'One of you prefers';
  if (count === 2) return 'Two of you prefer';
  return `${count} of you prefer`;
}

function scenarioNote(scenarioId: string, keys: MeaningKey[]): string | null {
  if (keys.length === 0) return null;
  const counts = new Map<MeaningKey, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  const top = Math.max(...counts.values());
  if (top / keys.length >= SCENARIO_MAJORITY) return null;

  if (scenarioId === 'decision-speed') {
    const fast = keys.filter((key) => key === 'A' || key === 'B').length;
    const deliberate = keys.filter((key) => key === 'C' || key === 'D').length;
    const rule = 'Agree on a rule: discuss for 10 minutes, then vote.';
    if (fast > 0 && deliberate > 0) {
      return `${peopleCount(fast)} to decide fast, and ${peopleCount(deliberate).toLowerCase()} to discuss first. ${rule}`;
    }
    return `The team is split on how quickly to decide. ${rule}`;
  }
  if (scenarioId === 'conflict-approach') {
    const direct = keys.filter((key) => key === 'A' || key === 'B').length;
    const avoidant = keys.filter((key) => key === 'C' || key === 'D').length;
    const rule = 'Agree on a rule: name the issue in the group within a day, then decide who follows up.';
    if (direct > 0 && avoidant > 0) {
      return `${peopleCount(direct)} to name a problem directly, and ${peopleCount(avoidant).toLowerCase()} to wait or handle it quietly. ${rule}`;
    }
    return `The team is split on how to raise a late task. ${rule}`;
  }
  return 'Agree on a rule: say what you question, then name one part of the idea you can build on.';
}

function mapTurns(
  turns: Turn[],
  members: Member[],
  speakerMap: Record<string, string>,
): { analyzed: AnalyzedTurn[]; unmapped: string[] } {
  const byId = new Map(members.map((member) => [member.id, member]));
  const unmapped: string[] = [];
  const analyzed: AnalyzedTurn[] = [];
  for (const turn of turns) {
    const mapped = speakerMap[turn.speaker];
    if (mapped === undefined || mapped === '') {
      if (!unmapped.includes(turn.speaker)) unmapped.push(turn.speaker);
      continue;
    }
    if (mapped === IGNORE_SPEAKER) continue;
    const member = byId.get(mapped);
    if (!member) {
      if (!unmapped.includes(turn.speaker)) unmapped.push(turn.speaker);
      continue;
    }
    const next: AnalyzedTurn = {
      index: turn.index,
      memberId: member.id,
      name: member.name,
      text: turn.text,
      wordCount: turn.wordCount,
    };
    if (turn.startSec !== undefined) next.startSec = turn.startSec;
    if (turn.endSec !== undefined) next.endSec = turn.endSec;
    analyzed.push(next);
  }
  return { analyzed, unmapped };
}

function participationOf(members: Member[], turns: AnalyzedTurn[]): ParticipationResult {
  const totalWords = turns.reduce((sum, turn) => sum + turn.wordCount, 0);
  const totalTurns = turns.length;
  const equalShare = members.length > 0 ? 1 / members.length : 0;
  const rows: MemberSpeech[] = members.map((member) => {
    const own = turns.filter((turn) => turn.memberId === member.id);
    const words = own.reduce((sum, turn) => sum + turn.wordCount, 0);
    const wordShare = totalWords > 0 ? words / totalWords : 0;
    const turnShare = totalTurns > 0 ? own.length / totalTurns : 0;
    return {
      memberId: member.id,
      name: member.name,
      words,
      turns: own.length,
      wordShare,
      turnShare,
      dominant: equalShare > 0 && wordShare > DOMINANT_SHARE_MULTIPLIER * equalShare,
      quiet: equalShare > 0 && wordShare < QUIET_SHARE_MULTIPLIER * equalShare,
    };
  });
  const balance = shannonBalance(rows.map((row) => row.words));
  return {
    members: rows,
    totalWords,
    totalTurns,
    balance,
    label: balance === null ? null : balanceLabel(balance),
    equalShare,
  };
}

function phraseFrom(turn: AnalyzedTurn, stems: Set<string> | null): string {
  const words = contentWords(turn.text);
  const anchor = (stems ? words.find((word) => stems.has(word.stem)) : undefined) ?? words[0];
  if (!anchor) return 'that point';
  const tokens = turn.text.trim().split(/\s+/);
  const start = tokens.findIndex((token) => token.toLowerCase().replace(/[^a-z0-9]/g, '') === anchor.display);
  const slice = tokens.slice(start < 0 ? 0 : start, (start < 0 ? 0 : start) + 6);
  const phrase = slice.join(' ').replace(/[“”"'.,!?;:—\-]+$/g, '').trim();
  return phrase || anchor.display;
}

function uptakeOf(members: Member[], turns: AnalyzedTurn[]): UptakeResult {
  const builtOn = new Map<string, number>(members.map((member) => [member.id, 0]));
  const pickedUp = new Map<string, number>(members.map((member) => [member.id, 0]));
  const examples = new Map<string, UptakeExample[]>(members.map((member) => [member.id, []]));

  turns.forEach((turn, index) => {
    const ownWords = contentWords(turn.text);
    const prior = new Set<string>();
    for (let cursor = Math.max(0, index - UPTAKE_PRIOR_TURNS); cursor < index; cursor += 1) {
      const earlier = turns[cursor];
      if (!earlier) continue;
      for (const word of contentWords(earlier.text)) prior.add(word.stem);
    }
    const introduced = new Set(ownWords.map((word) => word.stem).filter((stem) => !prior.has(stem)));

    const next = turns[index + 1];
    const direct = next && next.memberId !== turn.memberId ? next : null;
    let wasPickedUp = false;

    let seenOthers = 0;
    for (let cursor = index + 1; cursor < turns.length && seenOthers < UPTAKE_LATER_TURNS; cursor += 1) {
      const later = turns[cursor];
      if (!later || later.memberId === turn.memberId) continue;
      seenOthers += 1;
      const laterStems = new Set(contentWords(later.text).map((word) => word.stem));
      let shared = 0;
      const sharedStems = new Set<string>();
      for (const stem of introduced) {
        if (!laterStems.has(stem)) continue;
        shared += 1;
        sharedStems.add(stem);
      }
      const wordMatch = shared >= UPTAKE_SHARED_WORDS;
      const phraseMatch = direct !== null && later === direct && hasBuildPhrase(later.text, turn.name);
      if (!wordMatch && !phraseMatch) continue;
      builtOn.set(later.memberId, (builtOn.get(later.memberId) ?? 0) + 1);
      wasPickedUp = true;
      const bucket = examples.get(turn.memberId);
      if (bucket && bucket.length < 3) {
        bucket.push({
          sourceMemberId: turn.memberId,
          sourceTurnIndex: turn.index,
          targetMemberId: later.memberId,
          targetName: later.name,
          phrase: phraseFrom(turn, wordMatch ? sharedStems : null),
        });
      }
    }
    if (wasPickedUp) pickedUp.set(turn.memberId, (pickedUp.get(turn.memberId) ?? 0) + 1);
  });

  const rows: MemberUptake[] = members.map((member) => {
    const substantiveTurns = turns.filter(
      (turn) => turn.memberId === member.id && contentWords(turn.text).length >= SUBSTANTIVE_CONTENT_WORDS,
    ).length;
    const ideasPickedUp = pickedUp.get(member.id) ?? 0;
    return {
      memberId: member.id,
      name: member.name,
      ideasPickedUp,
      builtOnOthers: builtOn.get(member.id) ?? 0,
      substantiveTurns,
      uptakeRate: substantiveTurns > 0 ? ideasPickedUp / substantiveTurns : 0,
      examples: examples.get(member.id) ?? [],
    };
  });

  return {
    members: rows,
    spreadCount: rows.filter((row) => row.uptakeRate >= UPTAKE_SPREAD_MIN_RATE).length,
    memberCount: members.length,
  };
}

function questionsOf(turns: AnalyzedTurn[]): QuestionItem[] {
  const unanswered: QuestionItem[] = [];
  turns.forEach((turn, index) => {
    if (!isQuestion(turn.text)) return;
    const ahead = turns.slice(index + 1, index + 1 + QUESTION_LOOKAHEAD);
    const answered = ahead.some((later) => later.memberId !== turn.memberId);
    if (answered) return;
    unanswered.push({
      memberId: turn.memberId,
      name: turn.name,
      text: turn.text,
      turnIndex: turn.index,
    });
  });
  return unanswered;
}

function interruptionsOf(turns: AnalyzedTurn[]): InterruptionItem[] {
  const items: InterruptionItem[] = [];
  for (let index = 0; index < turns.length - 1; index += 1) {
    const current = turns[index];
    const next = turns[index + 1];
    if (!current || !next || current.memberId === next.memberId) continue;
    const timed =
      current.endSec !== undefined &&
      next.startSec !== undefined &&
      next.startSec < current.endSec;
    if (timed) {
      items.push({
        fromMemberId: current.memberId,
        fromName: current.name,
        byMemberId: next.memberId,
        byName: next.name,
        kind: 'overlap',
      });
      continue;
    }
    if (/(\u2014|--|\.\.\.)\s*$/.test(current.text.trim())) {
      items.push({
        fromMemberId: current.memberId,
        fromName: current.name,
        byMemberId: next.memberId,
        byName: next.name,
        kind: 'cutoff',
      });
    }
  }
  return items;
}

function termsOf(terms: CharterTerm[], members: Member[], responses: SurveyResponse[]): TermAlignment[] {
  const namedIds = new Set(members.map((member) => member.id));
  const rows: TermAlignment[] = terms.map((term) => {
    const answers = responses.filter(
      (response) => namedIds.has(response.memberId) && response.meanings[term.id] !== undefined,
    );
    const segments: MeaningSegment[] = MEANING_KEYS.map((key) => ({
      key,
      text: meaningText(term, key),
      memberIds: answers
        .filter((response) => response.meanings[term.id] === key)
        .map((response) => response.memberId),
    }));
    const respondents = answers.length;
    const topCount = segments.reduce((max, segment) => Math.max(max, segment.memberIds.length), 0);
    const agreement = respondents > 0 ? topCount / respondents : 0;
    const leaders = segments.filter((segment) => segment.memberIds.length === topCount && topCount > 0);
    const strictMajority = leaders.length === 1 && leaders[0] && topCount > respondents / 2 ? leaders[0] : null;
    const status = respondents > 0 ? alignmentBand(agreement) : 'misaligned';
    const chosen = leaders.map((segment) => segment.text);
    const rewrite = respondents > 0 && status !== 'aligned' ? rewriteLine(term.rewriteTemplate, chosen) : null;
    const row: TermAlignment = {
      termId: term.id,
      label: term.label,
      status: respondents > 0 ? status : 'misaligned',
      agreement,
      respondents,
      segments,
      rewrite,
      majorityKey: strictMajority?.key ?? null,
      majorityText: strictMajority?.text ?? null,
    };
    if (term.sourceSentence) row.sourceSentence = term.sourceSentence;
    return row;
  });

  const rank: Record<AlignmentBand, number> = { misaligned: 0, partly: 1, aligned: 2 };
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const aRank = a.row.respondents === 0 ? 3 : rank[a.row.status];
      const bRank = b.row.respondents === 0 ? 3 : rank[b.row.status];
      return aRank - bRank || a.index - b.index;
    })
    .map((item) => item.row);
}

function scenariosOf(members: Member[], responses: SurveyResponse[]): ScenarioAlignment[] {
  const namedIds = new Set(members.map((member) => member.id));
  return SCENARIOS.map((scenario, scenarioIndex) => {
    const choices: ScenarioChoice[] = [];
    for (const member of members) {
      const response = responses.find((item) => item.memberId === member.id && namedIds.has(member.id));
      const key = response?.scenarios[scenarioIndex];
      if (!key) continue;
      const option = scenario.options.find((item) => item.key === key);
      choices.push({ memberId: member.id, name: member.name, key, text: option?.text ?? key });
    }
    const note = scenarioNote(
      scenario.id,
      choices.map((choice) => choice.key),
    );
    return {
      scenarioId: scenario.id,
      dimension: scenario.dimension,
      prompt: scenario.prompt,
      choices,
      split: note !== null,
      note: note === null ? null : `Your team has different styles here. ${note}`,
    };
  });
}

function sharedScore(terms: TermAlignment[]): number | null {
  const answered = terms.filter((term) => term.respondents > 0);
  if (answered.length === 0) return null;
  const mean = answered.reduce((sum, term) => sum + term.agreement, 0) / answered.length;
  return mean * 100;
}

export function analyze(input: {
  members: Member[];
  terms: CharterTerm[];
  responses: SurveyResponse[];
  turns: Turn[];
  speakerMap: Record<string, string>;
  parseError?: string | null;
}): TeamAnalysis {
  const members = input.members.filter((member) => member.name.trim() !== '');
  const { analyzed, unmapped } = mapTurns(input.turns, members, input.speakerMap);
  const terms = termsOf(input.terms, members, input.responses);
  return {
    members,
    turns: analyzed,
    unmappedSpeakers: unmapped,
    parseError: input.parseError ?? null,
    participation: participationOf(members, analyzed),
    uptake: uptakeOf(members, analyzed),
    unanswered: questionsOf(analyzed),
    interruptions: interruptionsOf(analyzed),
    terms,
    sharedMeaning: sharedScore(terms),
    scenarios: scenariosOf(members, input.responses),
  };
}

export function analyzeSession(session: TeamSession): TeamAnalysis {
  const parsed = parseTranscript(session.transcriptText);
  return analyze({
    members: session.members,
    terms: session.selectedTerms,
    responses: session.responses,
    turns: parsed.turns,
    speakerMap: session.speakerMap,
    parseError: parsed.error,
  });
}
