/**
 * Read and write the team session in localStorage.
 * Every browser call is inside try/catch: private mode, a full disk, or a
 * blocked storage API should degrade to an in-memory session, not a crash.
 */

import {
  MAX_MEMBERS,
  STORAGE_KEY,
  createEmptySession,
  type CharterTerm,
  type FourMeanings,
  type MeaningKey,
  type Member,
  type MemberAssessment,
  type SurveyResponse,
  type TeamSession,
  type TermMeaning,
} from './types';

export interface LoadedSession {
  session: TeamSession;
  /** True when the browser refused to touch storage. The session still works in memory. */
  storageError: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMeaningKey(value: unknown): value is MeaningKey {
  return value === 'A' || value === 'B' || value === 'C' || value === 'D';
}

function isTermMeaning(value: unknown): value is TermMeaning {
  return isRecord(value) && isMeaningKey(value.key) && typeof value.text === 'string';
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function asFourMeanings(value: unknown): FourMeanings | null {
  if (!isUnknownArray(value) || value.length !== 4) return null;
  const first = value[0];
  const second = value[1];
  const third = value[2];
  const fourth = value[3];
  if (!isTermMeaning(first) || !isTermMeaning(second) || !isTermMeaning(third) || !isTermMeaning(fourth)) {
    return null;
  }
  return [first, second, third, fourth];
}

function isMember(value: unknown): value is Member {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || value.id.trim() === '') return false;
  if (typeof value.name !== 'string') return false;
  if (value.role !== undefined && typeof value.role !== 'string') return false;
  return true;
}

function isCharterTerm(value: unknown): value is CharterTerm {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || typeof value.label !== 'string') return false;
  if (!Array.isArray(value.synonyms) || !value.synonyms.every((item) => typeof item === 'string')) {
    return false;
  }
  if (asFourMeanings(value.meanings) === null) return false;
  if (typeof value.rewriteTemplate !== 'string' || typeof value.isCustom !== 'boolean') return false;
  if (value.sourceSentence !== undefined && typeof value.sourceSentence !== 'string') return false;
  return true;
}

function isMeaningMap(value: unknown): value is Record<string, MeaningKey> {
  if (!isRecord(value)) return false;
  return Object.values(value).every((entry) => isMeaningKey(entry));
}

function asScenarioTrio(value: unknown): [MeaningKey, MeaningKey, MeaningKey] | null {
  if (!isUnknownArray(value) || value.length !== 3) return null;
  const first = value[0];
  const second = value[1];
  const third = value[2];
  if (!isMeaningKey(first) || !isMeaningKey(second) || !isMeaningKey(third)) return null;
  return [first, second, third];
}

function isRating(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

function readResponse(value: unknown): SurveyResponse | null {
  if (!isRecord(value)) return null;
  if (typeof value.memberId !== 'string' || typeof value.memberName !== 'string') return null;
  if (!isMeaningMap(value.meanings)) return null;
  const scenarios = asScenarioTrio(value.scenarios);
  if (!scenarios) return null;

  const response: SurveyResponse = {
    memberId: value.memberId,
    memberName: value.memberName,
    meanings: value.meanings,
    scenarios,
  };
  if (isRating(value.selfRating)) response.selfRating = value.selfRating;
  if (isRating(value.comfort)) response.comfort = value.comfort;
  return response;
}

function readStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const record: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') record[key] = entry;
  }
  return record;
}

function readMeaningEdits(value: unknown): Record<string, FourMeanings> {
  if (!isRecord(value)) return {};
  const edits: Record<string, FourMeanings> = {};
  for (const [key, entry] of Object.entries(value)) {
    const meanings = asFourMeanings(entry);
    if (meanings) edits[key] = meanings;
  }
  return edits;
}

function readAssessments(value: unknown): Record<string, MemberAssessment> {
  if (!isRecord(value)) return {};
  const assessments: Record<string, MemberAssessment> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!isRecord(entry)) continue;
    const assessment: MemberAssessment = {};
    if (isRating(entry.participationRating)) assessment.participationRating = entry.participationRating;
    if (typeof entry.notes === 'string') assessment.notes = entry.notes;
    assessments[key] = assessment;
  }
  return assessments;
}

/** Drop fields we don't recognize and fall back when a saved blob is unusable. */
export function normalizeSession(value: unknown): TeamSession {
  const empty = createEmptySession();
  if (!isRecord(value)) return empty;

  const members = Array.isArray(value.members)
    ? value.members.filter(isMember).slice(0, MAX_MEMBERS)
    : [];

  const responses = Array.isArray(value.responses)
    ? value.responses.flatMap((entry) => {
        const response = readResponse(entry);
        return response ? [response] : [];
      })
    : [];

  return {
    teamName: typeof value.teamName === 'string' ? value.teamName : '',
    members: members.length > 0 ? members : empty.members,
    charterText: typeof value.charterText === 'string' ? value.charterText : '',
    selectedTerms: Array.isArray(value.selectedTerms) ? value.selectedTerms.filter(isCharterTerm) : [],
    customTerms: Array.isArray(value.customTerms) ? value.customTerms.filter(isCharterTerm) : [],
    meaningEdits: readMeaningEdits(value.meaningEdits),
    responses,
    transcriptText: typeof value.transcriptText === 'string' ? value.transcriptText : '',
    speakerMap: readStringRecord(value.speakerMap),
    assessments: readAssessments(value.assessments),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : empty.updatedAt,
  };
}

export function readSession(): LoadedSession {
  try {
    if (typeof localStorage === 'undefined') {
      return { session: createEmptySession(), storageError: true };
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { session: createEmptySession(), storageError: false };
    try {
      return { session: normalizeSession(JSON.parse(raw) as unknown), storageError: false };
    } catch {
      // Corrupt JSON should not block the app. Start fresh.
      return { session: createEmptySession(), storageError: false };
    }
  } catch {
    return { session: createEmptySession(), storageError: true };
  }
}

/** Returns false when the write was rejected. The caller keeps the in-memory copy. */
export function writeSession(session: TeamSession): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}
