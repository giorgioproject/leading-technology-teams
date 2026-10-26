/**
 * Personal nudges and the team action plan.
 * Each nudge is second person, specific, and capped at three so a card stays readable.
 * A low comfort score is never attached to a name.
 */

import { DOMINANT_SHARE_MULTIPLIER, QUIET_SHARE_MULTIPLIER, type TeamAnalysis } from './analysis';
import type { SurveyResponse } from './types';

export const LOW_UPTAKE_RATE = 0.15;
export const HIGH_UPTAKE_RATE = 0.4;
export const LOW_COMFORT = 2;
export const HIGH_SELF_RATING = 4;
export const LOW_SELF_RATING = 2;
export const MAX_NUDGES = 3;
export const MIN_NUDGES = 2;
export const ACTION_PLAN_LIMIT = 3;
export const UNANSWERED_ACTION_MIN = 3;
export const BALANCE_ACTION_MAX = 70;

const TEAM_COMFORT_NOTE =
  "Some members feel less comfortable sharing ideas. Consider rotating who speaks first and normalizing 'half-baked' ideas.";

const FALLBACKS = [
  'Pick one decision from this meeting and write down who will do it, by when, and where the team can see it.',
  'In the next meeting, ask one teammate what they need from you before you add a new task.',
];

export interface MemberNudges {
  memberId: string;
  name: string;
  nudges: string[];
}

export interface NudgeReport {
  members: MemberNudges[];
  teamNotes: string[];
  actions: string[];
}

function percent(share: number): number {
  return Math.round(share * 100);
}

function otherName(name: string, names: string[]): string {
  return names.find((item) => item !== name) ?? 'a teammate';
}

function listLabels(labels: string[]): string {
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0] ?? '';
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}

export function buildActionPlan(input: {
  misalignedLabels: string[];
  balance: number | null;
  uptakeSpread: number;
  memberCount: number;
  unanswered: number;
  scenarioDimensions: string[];
}): string[] {
  const actions: string[] = [];
  if (input.misalignedLabels.length > 0) {
    actions.push(
      `Agree on one meaning for ${listLabels(input.misalignedLabels)}. Start from the suggested charter line, then fill in what, when, and where.`,
    );
  }
  if (input.balance !== null && input.balance < BALANCE_ACTION_MAX) {
    actions.push(
      'Speaking time is uneven. In the next meeting, invite a quieter teammate by name before the same person continues.',
    );
  }
  if (input.memberCount > 1 && input.uptakeSpread < input.memberCount - 1) {
    actions.push(
      `Ideas from ${input.uptakeSpread} of ${input.memberCount} members were built on. Before you move on, repeat the idea and say who it came from.`,
    );
  }
  if (input.unanswered >= UNANSWERED_ACTION_MIN) {
    actions.push(
      `${input.unanswered} questions got no reply. Save the last two minutes to answer the ones still open.`,
    );
  }
  if (input.scenarioDimensions.length > 0) {
    actions.push(
      `Your team works differently on ${listLabels(input.scenarioDimensions.map((item) => item.toLowerCase()))}. Write one rule for each, starting with how long you discuss before you vote.`,
    );
  }
  return actions.slice(0, ACTION_PLAN_LIMIT);
}

export function buildNudges(analysis: TeamAnalysis, responses: SurveyResponse[]): NudgeReport {
  const names = analysis.members.map((member) => member.name);
  const equal = analysis.participation.equalShare;
  const teamNotes: string[] = [];
  if (responses.some((response) => response.comfort !== undefined && response.comfort <= LOW_COMFORT)) {
    teamNotes.push(TEAM_COMFORT_NOTE);
  }

  const members: MemberNudges[] = analysis.members.map((member) => {
    const speech = analysis.participation.members.find((row) => row.memberId === member.id);
    const uptake = analysis.uptake.members.find((row) => row.memberId === member.id);
    const response = responses.find((item) => item.memberId === member.id);
    const lines: string[] = [];
    const share = speech?.wordShare ?? 0;
    const spoken = percent(share);
    const equalPercent = percent(equal);

    if (speech?.dominant) {
      lines.push(
        `You held ${spoken}% of the conversation (an equal share would be ${equalPercent}%). Try asking a quieter teammate for their view by name before giving yours.`,
      );
    }
    if (speech?.quiet) {
      lines.push(
        `You spoke ${spoken}% of the time. Your perspective is needed. Try preparing one idea or question before each meeting, and share it in the first 10 minutes.`,
      );
    }
    if (
      response?.selfRating !== undefined &&
      equal > 0 &&
      ((response.selfRating >= HIGH_SELF_RATING && share < QUIET_SHARE_MULTIPLIER * equal) ||
        (response.selfRating <= LOW_SELF_RATING && share > DOMINANT_SHARE_MULTIPLIER * equal))
    ) {
      lines.push(
        `You rated your contribution ${response.selfRating}/5, while you spoke ${spoken}% of the time. Worth reflecting on: contribution can happen outside meetings too.`,
      );
    }
    if (uptake && !speech?.quiet && uptake.uptakeRate < LOW_UPTAKE_RATE) {
      const partner = otherName(member.name, names);
      lines.push(
        `Your ideas were built on ${uptake.ideasPickedUp} times. Try linking your point to what someone just said ('Building on ${partner}'s idea…'). It makes ideas easier to pick up.`,
      );
    }
    const unanswered = analysis.unanswered.filter((item) => item.memberId === member.id).length;
    if (unanswered > 0) {
      const partner = otherName(member.name, names);
      lines.push(
        `${unanswered} of your questions got no reply. Try directing them to someone: '${partner}, what do you think?'`,
      );
    }
    if (uptake && uptake.uptakeRate >= HIGH_UPTAKE_RATE) {
      lines.push(
        "Your ideas shaped the discussion. Keep it up, and make sure to credit and build on others' ideas too.",
      );
    }
    if (uptake && uptake.builtOnOthers === 0 && analysis.turns.length > 0) {
      const partner = otherName(member.name, names);
      lines.push(`You haven't built on others' ideas yet. Try saying 'To add to what ${partner} said…' at least once.`);
    }
    for (const term of analysis.terms) {
      if (!term.majorityText || !response) continue;
      const chosen = response.meanings[term.termId];
      if (!chosen || chosen === term.majorityKey) continue;
      const meaning = term.segments.find((segment) => segment.key === chosen)?.text ?? chosen;
      lines.push(
        `On '${term.label},' you chose '${meaning},' while most of the team chose '${term.majorityText}.' Bring this up when you discuss the charter.`,
      );
      break;
    }

    const nudges = lines.slice(0, MAX_NUDGES);
    for (const extra of FALLBACKS) {
      if (nudges.length >= MIN_NUDGES) break;
      if (!nudges.includes(extra)) nudges.push(extra);
    }
    return { memberId: member.id, name: member.name, nudges };
  });

  const actions = buildActionPlan({
    misalignedLabels: analysis.terms.filter((term) => term.respondents > 0 && term.status === 'misaligned').map((term) => term.label),
    balance: analysis.participation.balance,
    uptakeSpread: analysis.uptake.spreadCount,
    memberCount: analysis.uptake.memberCount,
    unanswered: analysis.unanswered.length,
    scenarioDimensions: analysis.scenarios.filter((scenario) => scenario.split).map((scenario) => scenario.dimension),
  });

  return { members, teamNotes, actions };
}
