/**
 * Preset charter terms. The parser matches `synonyms` (and the label) case-insensitively.
 * `{chosen meaning}` in a rewrite template is filled in later with the meaning the team agrees on.
 */

import type { CharterTerm, FourMeanings, MeaningKey } from './types';

function meanings(a: string, b: string, c: string, d: string): FourMeanings {
  const keys: MeaningKey[] = ['A', 'B', 'C', 'D'];
  const texts = [a, b, c, d];
  return texts.map((text, index) => ({ key: keys[index], text })) as FourMeanings;
}

function term(
  id: string,
  label: string,
  synonyms: string[],
  four: FourMeanings,
  concrete: string,
): CharterTerm {
  const labelKey = label.toLowerCase();
  const unique = [labelKey, ...synonyms.map((item) => item.toLowerCase())].filter(
    (item, index, all) => item.trim() !== '' && all.indexOf(item) === index,
  );
  return {
    id,
    label,
    synonyms: unique,
    meanings: four,
    rewriteTemplate: `On our team, "${label}" means: {chosen meaning}. Concretely: ${concrete}`,
    isCustom: false,
  };
}

/** A blank rewrite line for a term the leader typed themselves. */
export function customRewriteTemplate(label: string): string {
  return `On our team, "${label}" means: {chosen meaning}. Concretely: ___ (what), by ___ (when), visible in ___ (where).`;
}

export const TERM_LIBRARY: CharterTerm[] = [
  term(
    'on-time',
    'On time',
    ['on time', 'deadline', 'punctual', 'timely'],
    meanings(
      'Submitted right before the deadline',
      'Done at least 24h early so others can review',
      'A draft is ready by our check-in meeting',
      'Roughly on time; quality matters more than the exact hour',
    ),
    '___ (what), by ___ (when), visible in ___ (where, e.g., shared drive).',
  ),
  term(
    'done',
    'Done',
    ['done', 'complete', 'finished', 'deliverable'],
    meanings(
      'First full draft exists',
      'Reviewed by at least one teammate',
      'Polished and ready to submit',
      "My part is finished, even if it isn't integrated yet",
    ),
    '___ (which piece of work), reviewed by ___ (who), visible in ___ (where).',
  ),
  term(
    'quality-work',
    'Quality work',
    ['quality work', 'quality', 'high standard', 'excellent', 'best work'],
    meanings(
      'No errors and well formatted',
      'Original, creative ideas',
      'Meets every rubric requirement',
      'Backed by solid research and evidence',
    ),
    '___ (what good looks like), checked against ___ (standard), visible in ___ (where).',
  ),
  term(
    'communication',
    'Communication',
    ['communicate', 'communication', 'responsive', 'updates', 'reply'],
    meanings(
      'Reply within a few hours',
      'Reply within 24 hours',
      "Speak up only when there's a problem",
      'Proactively share progress updates',
    ),
    '___ (what we share), within ___ (how long), in ___ (which channel).',
  ),
  term(
    'respect',
    'Respect',
    ['respect', 'respectful', 'courtesy'],
    meanings(
      'Never interrupting',
      'Being on time and prepared',
      'Openly and honestly disagreeing',
      "Considering everyone's feelings before speaking",
    ),
    '___ (the behavior), during ___ (which moments), noticed when ___ (what others see).',
  ),
  term(
    'accountability',
    'Accountability',
    ['accountable', 'accountability', 'responsibility', 'ownership'],
    meanings(
      'Doing exactly what I committed to',
      "Telling the team early if I'll miss something",
      'Owning mistakes publicly',
      "Checking in on others' tasks too",
    ),
    '___ (the commitment), told to the team by ___ (when), recorded in ___ (where).',
  ),
  term(
    'everyone-contributes',
    'Everyone contributes',
    ['everyone contributes', 'contributes', 'contribute', 'equal', 'fair share', 'participation', 'workload'],
    meanings(
      'Equal number of hours',
      'Equal visible output',
      'Everyone speaks up in meetings',
      'Each person contributes their strengths, even if amounts differ',
    ),
    '___ (what each person owes), by ___ (when), visible in ___ (where).',
  ),
  term(
    'decision-making',
    'Decision-making',
    ['decision-making', 'decision making', 'decide', 'decision', 'consensus', 'vote', 'agree'],
    meanings(
      'Everyone must agree (consensus)',
      'Majority vote',
      'The person who owns the task decides',
      'The leader decides after hearing everyone',
    ),
    '___ (which decisions), decided by ___ (what rule), recorded in ___ (where).',
  ),
  term(
    'feedback',
    'Feedback',
    ['feedback', 'critique', 'review'],
    meanings(
      'Direct and immediate, even if blunt',
      'Written comments on the document',
      'Private, one-on-one',
      'Mostly positive, to keep motivation high',
    ),
    '___ (what we comment on), delivered ___ (how), visible in ___ (where).',
  ),
  term(
    'prepared',
    'Prepared',
    ['prepared', 'preparation', 'ready', 'come ready'],
    meanings(
      'Read the materials before the meeting',
      'Brought finished work to share',
      'Have ideas or questions ready',
      'Know the agenda',
    ),
    '___ (what "ready" includes), done before ___ (which meeting), visible in ___ (where).',
  ),
  term(
    'flexibility',
    'Flexibility',
    ['flexible', 'flexibility', 'adapt'],
    meanings(
      'Changing the plan when needed',
      "Covering for others when they're busy",
      'Flexible meeting times',
      'Not being strict about deadlines',
    ),
    '___ (what can change), decided by ___ (who), told to the team in ___ (where).',
  ),
  term(
    'conflict',
    'Conflict',
    ['conflict', 'disagree', 'disagreement', 'tension'],
    meanings(
      'Discuss it openly in the meeting',
      'Talk privately first',
      'Let the leader resolve it',
      'Avoid it unless it really matters',
    ),
    '___ (what we do first), within ___ (how long), recorded in ___ (where), if at all.',
  ),
];

export function libraryTermById(id: string): CharterTerm | undefined {
  return TERM_LIBRARY.find((term) => term.id === id);
}
