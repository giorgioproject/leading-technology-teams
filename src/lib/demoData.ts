/**
 * A finished sample team. The charter, quiz, and transcript are written so the
 * report shows misalignment, a dominant voice, a quiet idea that gets picked up,
 * unanswered questions, and a low comfort score kept at the team level.
 */

import { libraryTermById } from './termLibrary';
import {
  IGNORE_SPEAKER,
  type CharterTerm,
  type FourMeanings,
  type MeaningKey,
  type Member,
  type SurveyResponse,
  type TeamSession,
} from './types';

export const DEMO_IDS = {
  sara: 'demo-sara',
  marco: 'demo-marco',
  lena: 'demo-lena',
  david: 'demo-david',
} as const;

const MEMBERS: Member[] = [
  { id: DEMO_IDS.sara, name: 'Sara', role: 'Researcher' },
  { id: DEMO_IDS.marco, name: 'Marco', role: 'Coordinator' },
  { id: DEMO_IDS.lena, name: 'Lena' },
  { id: DEMO_IDS.david, name: 'David' },
];

const CHARTER =
  'Team Atlas will deliver work on time and at high quality. Everyone contributes. We keep communication open and make decisions by consensus.';

function selectTerm(id: string, sentence: string): CharterTerm {
  const found = libraryTermById(id);
  if (!found) throw new Error(`Missing library term ${id}`);
  const meanings = found.meanings.map((meaning) => ({ ...meaning })) as FourMeanings;
  return { ...found, synonyms: [...found.synonyms], meanings, sourceSentence: sentence };
}

function answer(
  memberId: string,
  name: string,
  meanings: Record<string, MeaningKey>,
  scenarios: [MeaningKey, MeaningKey, MeaningKey],
  selfRating: number,
  comfort: number,
): SurveyResponse {
  return { memberId, memberName: name, meanings, scenarios, selfRating, comfort };
}

const LINES: Array<[string, string]> = [
  ['Sara', 'Let us open the check-in and see where the class project stands today.'],
  ['Marco', 'I finished the reading summary, booked the library room, and drafted a poster headline for Thursday afternoon.'],
  ['Sara', 'Sounds good. I have the section outline in the shared folder.'],
  ['Marco', 'I emailed the print shop about paper sizes and asked them to hold the blue cardstock until Friday afternoon.'],
  ['Lena', 'I can review the slides.'],
  ['Marco', 'The bibliography is only half done, and I still need two sources on neighborhood history and transit maps.'],
  ['David', 'I wrapped up my notes.'],
  ['Sara', 'For me, on time means we submit the file right before the deadline.'],
  ['Marco', 'On time means the file is done at least a day early so I can review it before we send it.'],
  ['Lena', 'I thought a draft ready at our check-in was what on time meant for this team.'],
  ['David', 'Quality matters more than the exact hour, so roughly on time is enough for me.'],
  ['Marco', 'I keep circling the night before—'],
  ['Sara', 'I want a decision before we leave the room.'],
  ['David', 'Sounds good.'],
  ['Marco', 'I picked a serif font for the poster and a bright color for the title band across the top.'],
  ['Lena', 'We should survey local business owners before we lock our topic.'],
  ['Sara', "Building on Lena's point, a survey of local business owners can ground the whole project."],
  ['Marco', 'A survey of local business owners could be our first milestone, with a short form and a simple map.'],
  ['David', 'I can print a one page handout for the booth.'],
  ['Sara', 'I will bring the consent line for that form and a pen cup.'],
  ['Marco', 'I outlined a presentation script and timed the whole talk to six minutes, with a pause for the class.'],
  ['Lena', 'I can hold the timer.'],
  ['Marco', 'I compared three reference styles and settled on the one the syllabus shows in the appendix.'],
  ['Sara', 'Sounds good.'],
  ['Marco', 'I drafted speaker notes for the opening story about the farmers market on Saturday morning.'],
  ['Sara', "Building on Marco's point, the opening story should stay under a minute so we reach the findings."],
  ['Marco', 'I listed the props we still need, including tape, markers, and a folding table from the department closet.'],
  ['David', 'I can pick up the tape.'],
  ['Sara', 'I will confirm the room number with the front desk before Thursday.'],
  ['Marco', 'I wrote a backup plan in case the projector fails, using printed boards instead of slides for the whole talk.'],
  ['Lena', 'That backup helps the group.'],
  ['Sara', 'I can stand beside the map during the presentation.'],
  ['Marco', 'I also blocked thirty minutes after class to photograph the boards and upload them to the shared folder.'],
  ['David', 'I can carry the boards.'],
  ['Sara', 'Then we have a plan for the room, the boards, and the photos.'],
  ['Marco', 'I will send a reminder tonight with the room number, the prop list, and who is bringing each piece.'],
  ['David', 'What day is the draft due?'],
  ['Prof. Lee', 'I will send the syllabus note later.'],
  ['David', 'Should we ask the professor about the rubric?'],
];

export const DEMO_TRANSCRIPT = LINES.map(([name, text]) => `${name}: ${text}`).join('\n');

/** The sample session behind "Load demo team". */
export function createDemoSession(): TeamSession {
  const onTime = 'Team Atlas will deliver work on time and at high quality.';
  const everyone = 'Everyone contributes.';
  const communication = 'We keep communication open and make decisions by consensus.';
  return {
    teamName: 'Team Atlas',
    members: MEMBERS.map((member) => ({ ...member })),
    charterText: CHARTER,
    selectedTerms: [
      selectTerm('on-time', onTime),
      selectTerm('everyone-contributes', everyone),
      selectTerm('communication', communication),
      selectTerm('quality-work', onTime),
      selectTerm('decision-making', communication),
    ],
    customTerms: [],
    meaningEdits: {},
    responses: [
      answer(DEMO_IDS.sara, 'Sara', {
        'on-time': 'A',
        'everyone-contributes': 'A',
        communication: 'A',
        'quality-work': 'B',
        'decision-making': 'A',
      }, ['A', 'A', 'C'], 4, 4),
      answer(DEMO_IDS.marco, 'Marco', {
        'on-time': 'B',
        'everyone-contributes': 'B',
        communication: 'A',
        'quality-work': 'C',
        'decision-making': 'A',
      }, ['B', 'A', 'A'], 3, 4),
      answer(DEMO_IDS.lena, 'Lena', {
        'on-time': 'C',
        'everyone-contributes': 'C',
        communication: 'B',
        'quality-work': 'C',
        'decision-making': 'A',
      }, ['C', 'C', 'C'], 2, 2),
      answer(DEMO_IDS.david, 'David', {
        'on-time': 'D',
        'everyone-contributes': 'D',
        communication: 'C',
        'quality-work': 'C',
        'decision-making': 'D',
      }, ['D', 'D', 'D'], 4, 4),
    ],
    transcriptText: DEMO_TRANSCRIPT,
    speakerMap: {
      Sara: DEMO_IDS.sara,
      Marco: DEMO_IDS.marco,
      Lena: DEMO_IDS.lena,
      David: DEMO_IDS.david,
      'Prof. Lee': IGNORE_SPEAKER,
    },
    assessments: {
      [DEMO_IDS.sara]: { participationRating: 4 },
      [DEMO_IDS.marco]: { participationRating: 3 },
      [DEMO_IDS.lena]: {
        participationRating: 2,
        notes: 'Breakout note: Lena suggested surveying local businesses.',
      },
      [DEMO_IDS.david]: { participationRating: 4 },
    },
    updatedAt: new Date().toISOString(),
  };
}
