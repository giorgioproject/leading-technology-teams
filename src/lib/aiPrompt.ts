/**
 * Builds the text a team leader pastes into an AI assistant.
 * It carries the charter, the alignment results, the participation and uptake
 * numbers, and the transcript. Comfort scores stay out: they are never tied to a name.
 */

import type { TeamAnalysis, TermAlignment } from './analysis';
import { IGNORE_SPEAKER, type TeamSession } from './types';

const STATUS_LABEL: Record<TermAlignment['status'], string> = {
  aligned: 'Aligned',
  partly: 'Partly aligned',
  misaligned: 'Misaligned',
};

function percent(share: number): number {
  return Math.round(share * 100);
}

function memberName(analysis: TeamAnalysis, memberId: string): string {
  return analysis.members.find((member) => member.id === memberId)?.name ?? 'A teammate';
}

function termBlock(analysis: TeamAnalysis, term: TermAlignment): string {
  if (term.respondents === 0) {
    return `${term.label}: no quiz answers yet.`;
  }
  const choices = term.segments
    .flatMap((segment) =>
      segment.memberIds.map((id) => `- ${memberName(analysis, id)}: ${segment.text}`),
    )
    .join('\n');
  return [
    `${term.label} — ${STATUS_LABEL[term.status]}. Agreement ${percent(term.agreement)}% (${term.respondents} answers).`,
    choices,
    term.rewrite ? `Suggested charter line: ${term.rewrite}` : '',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

/** The prompt for the "Copy AI deep-analysis prompt" button. */
export function buildAiPrompt(session: TeamSession, analysis: TeamAnalysis): string {
  const team = session.teamName.trim() || 'This team';
  const charter = session.charterText.trim() || 'No charter was pasted.';
  const terms =
    analysis.terms.length > 0
      ? analysis.terms.map((term) => termBlock(analysis, term)).join('\n\n')
      : 'No charter terms were selected.';
  const meaning =
    analysis.sharedMeaning === null
      ? 'Shared meaning score: not available yet.'
      : `Shared meaning score: ${Math.round(analysis.sharedMeaning)} / 100.`;

  const balance = analysis.participation.balance;
  const balanceLine =
    balance === null
      ? 'Participation balance: not available yet.'
      : `Participation balance: ${Math.round(balance)} / 100 (${analysis.participation.label}). An equal share is ${percent(analysis.participation.equalShare)}%.`;
  const speech =
    analysis.participation.members.length === 0
      ? 'No members to score.'
      : analysis.participation.members
          .map((member) => {
            const flags = [member.dominant ? 'more than an even split' : '', member.quiet ? 'quieter than an even split' : '']
              .filter((flag) => flag !== '')
              .join('; ');
            return `- ${member.name}: ${member.words} words (${percent(member.wordShare)}%), ${member.turns} turns (${percent(member.turnShare)}%).${flags ? ` ${flags}.` : ''}`;
          })
          .join('\n');

  const uptakeIntro = `Idea uptake: ideas from ${analysis.uptake.spreadCount} of ${analysis.uptake.memberCount} members were built on.`;
  const uptake =
    analysis.uptake.members.length === 0
      ? 'No uptake scores yet.'
      : analysis.uptake.members
          .map((member) => {
            const examples = member.examples
              .map((example) => `  - "${example.phrase}" was picked up by ${example.targetName}.`)
              .join('\n');
            return [
              `- ${member.name}: ${member.ideasPickedUp} ideas picked up, built on others ${member.builtOnOthers} times, uptake rate ${percent(member.uptakeRate)}%.`,
              examples,
            ]
              .filter((line) => line !== '')
              .join('\n');
          })
          .join('\n');

  const ignored = Object.entries(session.speakerMap)
    .filter(([, id]) => id === IGNORE_SPEAKER)
    .map(([name]) => name);
  const ignoredLine =
    ignored.length > 0 ? `Speakers left out of the scores: ${ignored.join(', ')}.` : '';
  const unmappedLine =
    analysis.unmappedSpeakers.length > 0
      ? `Speakers not matched to a teammate yet: ${analysis.unmappedSpeakers.join(', ')}.`
      : '';

  const styles = analysis.scenarios
    .filter((scenario) => scenario.note)
    .map((scenario) => `- ${scenario.dimension}: ${scenario.note}`)
    .join('\n');

  const transcript = session.transcriptText.trim() || 'No transcript was added.';

  return [
    `You are coaching ${team} after they used CommonGround, a tool that compares what teammates mean by the words in their charter and how their meeting actually went.`,
    'Using only the material below, write:',
    '1. A qualitative reading of the team dynamics: the tone of the conversation, who sets the agenda, and missed opportunities. Quote the transcript when you make a claim.',
    '2. Exactly 5 coaching suggestions they can try in the next meeting. Keep each one warm, specific, and free of blame.',
    'Do not invent quotes, numbers, or people. If a section says it is missing, say so instead of guessing.',
    '',
    `Team: ${team}`,
    '',
    'Charter:',
    charter,
    '',
    meaning,
    '',
    'Alignment:',
    terms,
    '',
    styles ? `Working styles:\n${styles}` : 'Working styles: no scenario answers yet.',
    '',
    balanceLine,
    speech,
    ignoredLine,
    unmappedLine,
    '',
    uptakeIntro,
    uptake,
    '',
    'Transcript:',
    transcript,
  ].join('\n');
}
