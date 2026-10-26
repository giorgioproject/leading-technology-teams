/**
 * Types for one CommonGround session.
 * Everything the app knows about a team lives on TeamSession and is stored
 * in the browser under STORAGE_KEY. There is no server.
 */

export const STORAGE_KEY = 'commonground:v1';

export const MIN_MEMBERS = 2;
export const MAX_MEMBERS = 8;
export const MIN_TERMS = 4;
export const MAX_TERMS = 6;
export const MIN_SURVEY_RESPONSES = 2;

/** A transcript speaker mapped to this value is left out of the analysis. */
export const IGNORE_SPEAKER = 'ignore';

export const MEANING_KEYS = ['A', 'B', 'C', 'D'] as const;
export type MeaningKey = (typeof MEANING_KEYS)[number];

export const WORKFLOW_STEPS = [
  { id: 'setup', number: 1, label: 'Setup', path: '/setup' },
  { id: 'charter', number: 2, label: 'Charter', path: '/charter' },
  { id: 'survey', number: 3, label: 'Meaning Survey', path: '/survey' },
  { id: 'transcript', number: 4, label: 'Transcript', path: '/transcript' },
  { id: 'report', number: 5, label: 'Report', path: '/report' },
] as const;

export type WorkflowStepId = (typeof WORKFLOW_STEPS)[number]['id'];

/**
 * Chart colors, one per member, from the Okabe–Ito palette.
 * The last swatch is gray instead of black so it stays visible on paper and in dark mode.
 * Keep this list in sync with the `member` colors in tailwind.config.ts.
 */
export const MEMBER_COLORS = [
  '#0072B2',
  '#E69F00',
  '#009E73',
  '#D55E00',
  '#CC79A7',
  '#56B4E9',
  '#F0E442',
  '#6E6E6E',
] as const;

/** Shown in the footer. Replace the course title if the syllabus uses another name. */
export const COURSE_FOOTER =
  'Built for Leading Technology Teams, UCSB MTM · All data stays in your browser.';

export interface Member {
  id: string;
  name: string;
  /** Optional label for the leader's own notes. Not used to match the transcript. */
  role?: string;
}

/** One of the four interpretations offered for a charter term. */
export interface TermMeaning {
  key: MeaningKey;
  text: string;
}

export type FourMeanings = [TermMeaning, TermMeaning, TermMeaning, TermMeaning];

/** A preset or custom charter term, with the meanings the leader wants tested. */
export interface CharterTerm {
  id: string;
  label: string;
  /** Phrases the charter parser searches for. Custom terms may use an empty list. */
  synonyms: string[];
  meanings: FourMeanings;
  /** Use "{chosen meaning}" where the agreed definition should be filled in. */
  rewriteTemplate: string;
  isCustom: boolean;
  /** The charter sentence this term was found in, when detection supplied one. */
  sourceSentence?: string;
}

/** One teammate's answers to the Meaning Survey. */
export interface SurveyResponse {
  memberId: string;
  memberName: string;
  /** Term id → the meaning that person chose. */
  meanings: Record<string, MeaningKey>;
  /** Three workplace scenarios, in the order they were asked. */
  scenarios: [MeaningKey, MeaningKey, MeaningKey];
  /** 1–5. How much they feel they contributed in the last meeting. */
  selfRating?: number;
  /**
   * 1–5. How comfortable they feel sharing ideas.
   * This is only ever used as a team-level note, never beside a person's name.
   */
  comfort?: number;
}

/** One speaking turn from a parsed transcript. */
export interface Turn {
  index: number;
  speaker: string;
  text: string;
  wordCount: number;
  startSec?: number;
  endSec?: number;
}

/** Optional rating and notes entered on the transcript step. */
export interface MemberAssessment {
  /** 1–5. Prefilled from the quiz when that member sent a self-rating. */
  participationRating?: number;
  notes?: string;
}

/** The full team session. This object is what gets written to localStorage. */
export interface TeamSession {
  teamName: string;
  members: Member[];
  charterText: string;
  /** Terms the leader chose to test, including any edits to the four meanings. */
  selectedTerms: CharterTerm[];
  /** Custom terms the leader wrote, including ones that are not selected right now. */
  customTerms: CharterTerm[];
  /** Edits to preset meanings, keyed by term id, so they survive leaving the page. */
  meaningEdits: Record<string, FourMeanings>;
  responses: SurveyResponse[];
  transcriptText: string;
  /** Transcript speaker name → member id, or IGNORE_SPEAKER. */
  speakerMap: Record<string, string>;
  /** Member id → optional rating and notes. */
  assessments: Record<string, MemberAssessment>;
  updatedAt: string;
}

/** A stable id for members and custom terms. Works even if randomUUID is missing. */
export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** A blank session with the minimum two member rows, ready for Setup. */
export function createEmptySession(): TeamSession {
  return {
    teamName: '',
    members: [
      { id: createId(), name: '' },
      { id: createId(), name: '' },
    ],
    charterText: '',
    selectedTerms: [],
    customTerms: [],
    meaningEdits: {},
    responses: [],
    transcriptText: '',
    speakerMap: {},
    assessments: {},
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Whether a workflow step has the data it needs.
 * The report itself is never marked complete; it is the destination, not an input.
 */
export function isStepComplete(session: TeamSession, step: WorkflowStepId): boolean {
  switch (step) {
    case 'setup': {
      const named = session.members.filter((member) => member.name.trim() !== '');
      return (
        session.teamName.trim() !== '' &&
        session.members.length >= MIN_MEMBERS &&
        session.members.length <= MAX_MEMBERS &&
        named.length === session.members.length
      );
    }
    case 'charter':
      return session.selectedTerms.length >= MIN_TERMS && session.selectedTerms.length <= MAX_TERMS;
    case 'survey': {
      const memberIds = new Set(session.members.map((member) => member.id));
      const answered = session.responses.filter((response) => memberIds.has(response.memberId));
      return answered.length >= MIN_SURVEY_RESPONSES;
    }
    case 'transcript':
      return session.transcriptText.trim() !== '';
    case 'report':
      return false;
    default: {
      const unexpected: never = step;
      void unexpected;
      return false;
    }
  }
}
