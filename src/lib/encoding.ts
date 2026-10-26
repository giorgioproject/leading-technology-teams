/**
 * Turns a survey link and a result code into URL-safe text, and back.
 * The payload is JSON, then UTF-8, then base64url with no padding.
 * Every failure returns a sentence a team leader or a teammate can act on.
 */

import { SCENARIO_IDS } from './scenarios';
import {
  MAX_TERMS,
  MIN_TERMS,
  type CharterTerm,
  type MeaningKey,
  type SurveyResponse,
} from './types';

const CODE_VERSION = 1;
const MAX_CODE_LENGTH = 20_000;

export interface SurveyLinkTerm {
  id: string;
  /** The word the quiz shows, such as "On time". */
  term: string;
  /** Meaning texts in A, B, C, D order. */
  meanings: [string, string, string, string];
}

export interface SurveyLinkPayload {
  v: typeof CODE_VERSION;
  teamName: string;
  members: string[];
  terms: SurveyLinkTerm[];
  scenarioIds: [string, string, string];
}

/** Answers packed into the result code a teammate sends back. */
export interface QuizAnswers {
  name: string;
  meanings: Record<string, MeaningKey>;
  scenarios: [MeaningKey, MeaningKey, MeaningKey];
  selfRating?: number;
  comfort?: number;
}

export type CodecResult<T> = { ok: true; value: T } | { ok: false; error: string };

const LINK_UNREADABLE =
  'This quiz link could not be read. Ask your team leader to copy a fresh link from the Meaning Survey page.';
const LINK_MISSING =
  'This quiz link is missing the team information. Ask your team leader for a new link.';
const CODE_UNREADABLE = 'That code could not be read. Ask them to copy it again from the end of the quiz.';
const CODE_NOT_A_CODE =
  'That does not look like a result code. Copy it again from the end of the quiz.';
const CODE_MISMATCH =
  'This code does not match the terms you selected. Send the current link and ask them to retake the quiz.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMeaningKey(value: unknown): value is MeaningKey {
  return value === 'A' || value === 'B' || value === 'C' || value === 'D';
}

function isRating(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

function encodeJson(value: unknown): string | null {
  try {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index] ?? 0);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  } catch {
    return null;
  }
}

function decodeJson(raw: string): { ok: true; value: unknown } | { ok: false; empty: boolean; garbled: boolean } {
  const cleaned = raw.trim().replace(/\s+/g, '');
  if (!cleaned) return { ok: false, empty: true, garbled: false };
  if (cleaned.length > MAX_CODE_LENGTH || !/^[A-Za-z0-9_-]+$/.test(cleaned)) {
    return { ok: false, empty: false, garbled: true };
  }
  try {
    const padded = cleaned + '='.repeat((4 - (cleaned.length % 4)) % 4);
    const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) as unknown };
  } catch {
    return { ok: false, empty: false, garbled: false };
  }
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  if (leftSet.size !== left.length || rightSet.size !== right.length) return false;
  for (const id of leftSet) {
    if (!rightSet.has(id)) return false;
  }
  return true;
}

function readLinkTerm(value: unknown): SurveyLinkTerm | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || value.id.trim() === '') return null;
  if (typeof value.term !== 'string' || value.term.trim() === '') return null;
  if (!Array.isArray(value.meanings) || value.meanings.length !== 4) return null;
  const texts = value.meanings.map((item) => (typeof item === 'string' ? item.trim() : ''));
  if (texts.some((text) => text === '')) return null;
  const first = texts[0];
  const second = texts[1];
  const third = texts[2];
  const fourth = texts[3];
  if (first === undefined || second === undefined || third === undefined || fourth === undefined) return null;
  return {
    id: value.id,
    term: value.term.trim(),
    meanings: [first, second, third, fourth],
  };
}

/** Build the `s` query value for `/take?s=...` from the terms the leader selected. */
export function encodeSurveyLink(input: {
  teamName: string;
  memberNames: string[];
  terms: CharterTerm[];
}): CodecResult<string> {
  if (input.terms.length < MIN_TERMS || input.terms.length > MAX_TERMS) {
    return { ok: false, error: 'Choose 4 to 6 terms before creating a link.' };
  }
  const terms: SurveyLinkTerm[] = [];
  for (const term of input.terms) {
    const texts = term.meanings.map((meaning) => meaning.text.trim());
    if (texts.some((text) => text === '')) {
      return { ok: false, error: `“${term.label}” needs four meanings before you send the quiz.` };
    }
    const first = texts[0];
    const second = texts[1];
    const third = texts[2];
    const fourth = texts[3];
    if (first === undefined || second === undefined || third === undefined || fourth === undefined) {
      return { ok: false, error: `“${term.label}” needs four meanings before you send the quiz.` };
    }
    terms.push({ id: term.id, term: term.label, meanings: [first, second, third, fourth] });
  }

  const payload: SurveyLinkPayload = {
    v: CODE_VERSION,
    teamName: input.teamName.trim(),
    members: input.memberNames.map((name) => name.trim()).filter((name) => name !== ''),
    terms,
    scenarioIds: SCENARIO_IDS,
  };
  const encoded = encodeJson(payload);
  if (!encoded) return { ok: false, error: 'The quiz link could not be created in this browser.' };
  return { ok: true, value: encoded };
}

/** Read a quiz link. A missing or broken `s` value becomes a sentence for the teammate. */
export function decodeSurveyLink(raw: string | null): CodecResult<SurveyLinkPayload> {
  if (raw === null || raw.trim() === '') return { ok: false, error: LINK_MISSING };
  const decoded = decodeJson(raw);
  if (!decoded.ok) return { ok: false, error: decoded.garbled || decoded.empty ? LINK_MISSING : LINK_UNREADABLE };
  if (!isRecord(decoded.value) || decoded.value.v !== CODE_VERSION) {
    return { ok: false, error: LINK_UNREADABLE };
  }

  const teamName = typeof decoded.value.teamName === 'string' ? decoded.value.teamName.trim() : '';
  const members = Array.isArray(decoded.value.members)
    ? decoded.value.members.filter((name): name is string => typeof name === 'string').map((name) => name.trim()).filter(Boolean)
    : [];
  if (!Array.isArray(decoded.value.terms)) return { ok: false, error: LINK_UNREADABLE };
  const terms = decoded.value.terms.flatMap((item) => {
    const term = readLinkTerm(item);
    return term ? [term] : [];
  });
  if (terms.length !== decoded.value.terms.length || terms.length < 1 || terms.length > MAX_TERMS) {
    return { ok: false, error: 'This quiz link is missing the charter terms. Ask your team leader for a new link.' };
  }
  const ids = new Set(terms.map((term) => term.id));
  if (ids.size !== terms.length) return { ok: false, error: LINK_UNREADABLE };

  const scenarioIds = decoded.value.scenarioIds;
  if (!Array.isArray(scenarioIds) || scenarioIds.length !== 3) return { ok: false, error: LINK_UNREADABLE };
  const first = scenarioIds[0];
  const second = scenarioIds[1];
  const third = scenarioIds[2];
  if (first !== SCENARIO_IDS[0] || second !== SCENARIO_IDS[1] || third !== SCENARIO_IDS[2]) {
    return { ok: false, error: LINK_UNREADABLE };
  }

  return {
    ok: true,
    value: { v: CODE_VERSION, teamName, members, terms, scenarioIds: SCENARIO_IDS },
  };
}

/** Pack quiz answers into the short code the teammate copies. */
export function encodeResult(answers: QuizAnswers): CodecResult<string> {
  const name = answers.name.trim();
  if (!name) return { ok: false, error: 'Enter your name before finishing.' };
  const payload: Record<string, unknown> = {
    v: CODE_VERSION,
    name,
    meanings: answers.meanings,
    scenarios: answers.scenarios,
  };
  if (answers.selfRating !== undefined) payload.selfRating = answers.selfRating;
  if (answers.comfort !== undefined) payload.comfort = answers.comfort;
  const encoded = encodeJson(payload);
  if (!encoded) return { ok: false, error: 'The result code could not be created in this browser.' };
  return { ok: true, value: encoded };
}

/**
 * Read a pasted result code and check it against the terms currently selected.
 * `expectedTermIds` is the charter the leader is collecting for right now.
 */
export function decodeResult(raw: string, expectedTermIds: readonly string[]): CodecResult<QuizAnswers> {
  const decoded = decodeJson(raw);
  if (!decoded.ok) {
    if (decoded.empty) return { ok: false, error: 'Paste the result code.' };
    if (decoded.garbled) return { ok: false, error: CODE_NOT_A_CODE };
    return { ok: false, error: CODE_UNREADABLE };
  }
  if (!isRecord(decoded.value) || decoded.value.v !== CODE_VERSION) {
    return { ok: false, error: CODE_UNREADABLE };
  }
  if (typeof decoded.value.name !== 'string' || decoded.value.name.trim() === '') {
    return { ok: false, error: 'That code is missing a name. Ask them to finish the quiz and send the new code.' };
  }
  if (!isRecord(decoded.value.meanings)) {
    return { ok: false, error: 'That code is missing answers. Ask them to finish the quiz and send the new code.' };
  }

  const meaningIds = Object.keys(decoded.value.meanings);
  if (!sameIds(expectedTermIds, meaningIds)) return { ok: false, error: CODE_MISMATCH };
  const meanings: Record<string, MeaningKey> = {};
  for (const id of expectedTermIds) {
    const choice = decoded.value.meanings[id];
    if (!isMeaningKey(choice)) {
      return { ok: false, error: 'That code is missing answers. Ask them to finish the quiz and send the new code.' };
    }
    meanings[id] = choice;
  }

  if (!Array.isArray(decoded.value.scenarios) || decoded.value.scenarios.length !== 3) {
    return { ok: false, error: 'That code is missing the scenario answers. Ask them to finish the quiz and send the new code.' };
  }
  const scenarioA = decoded.value.scenarios[0];
  const scenarioB = decoded.value.scenarios[1];
  const scenarioC = decoded.value.scenarios[2];
  if (!isMeaningKey(scenarioA) || !isMeaningKey(scenarioB) || !isMeaningKey(scenarioC)) {
    return { ok: false, error: 'That code is missing the scenario answers. Ask them to finish the quiz and send the new code.' };
  }

  const answers: QuizAnswers = {
    name: decoded.value.name.trim(),
    meanings,
    scenarios: [scenarioA, scenarioB, scenarioC],
  };
  if (decoded.value.selfRating !== undefined) {
    if (!isRating(decoded.value.selfRating)) {
      return { ok: false, error: 'That code has a rating this page cannot use. Ask them to send it again.' };
    }
    answers.selfRating = decoded.value.selfRating;
  }
  if (decoded.value.comfort !== undefined) {
    if (!isRating(decoded.value.comfort)) {
      return { ok: false, error: 'That code has a rating this page cannot use. Ask them to send it again.' };
    }
    answers.comfort = decoded.value.comfort;
  }
  return { ok: true, value: answers };
}

/** Store a decoded code against the teammate whose box it was pasted into. */
export function responseFromCode(memberId: string, memberName: string, answers: QuizAnswers): SurveyResponse {
  const response: SurveyResponse = {
    memberId,
    memberName: memberName.trim(),
    meanings: answers.meanings,
    scenarios: answers.scenarios,
  };
  if (answers.selfRating !== undefined) response.selfRating = answers.selfRating;
  if (answers.comfort !== undefined) response.comfort = answers.comfort;
  return response;
}
