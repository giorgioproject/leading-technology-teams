import { describe, expect, it } from 'vitest';
import { analyze } from './analysis';
import { buildActionPlan, buildNudges } from './nudges';
import type { MeaningKey, Member, SurveyResponse, Turn } from './types';

const members: Member[] = [
  { id: 'sara', name: 'Sara' },
  { id: 'marco', name: 'Marco' },
  { id: 'lena', name: 'Lena' },
];

function turn(index: number, speaker: string, text: string): Turn {
  return { index, speaker, text, wordCount: text.trim().split(/\s+/).length };
}

describe('nudges', () => {
  it('writes a dominant speaker, a quiet one, and a team comfort note without naming them', () => {
    const turns = [
      turn(0, 'Marco', 'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november'),
      turn(1, 'Sara', 'I can bring the outline.'),
      turn(2, 'Lena', 'Okay.'),
    ];
    const responses: SurveyResponse[] = members.map((member) => ({
      memberId: member.id,
      memberName: member.name,
      meanings: {},
      scenarios: ['A', 'A', 'A'] as [MeaningKey, MeaningKey, MeaningKey],
      selfRating: member.id === 'lena' ? 2 : 4,
      comfort: member.id === 'lena' ? 2 : 4,
    }));
    const analysis = analyze({
      members,
      terms: [],
      responses,
      turns,
      speakerMap: { Marco: 'marco', Sara: 'sara', Lena: 'lena' },
    });
    const report = buildNudges(analysis, responses);
    const marco = report.members.find((item) => item.memberId === 'marco');
    const lena = report.members.find((item) => item.memberId === 'lena');
    expect(marco?.nudges[0]).toMatch(/held \d+% of the conversation/);
    expect(lena?.nudges.some((line) => line.includes('Your perspective is needed'))).toBe(true);
    expect(lena?.nudges.some((line) => line.includes('Your ideas were built on'))).toBe(false);
    expect(report.teamNotes[0]).toMatch(/less comfortable sharing ideas/);
    expect(report.members.every((item) => item.nudges.join(' ').includes('Lena') === false || item.memberId !== 'lena')).toBe(true);
    expect(report.members.every((item) => item.nudges.length >= 2 && item.nudges.length <= 3)).toBe(true);
    expect(JSON.stringify(report)).not.toMatch(/comfort score/i);
  });

  it('flags a high self-rating when the person spoke less than half an equal share', () => {
    const turns = [
      turn(0, 'Sara', 'one two three four five six seven eight nine ten eleven twelve'),
      turn(1, 'Marco', 'one'),
    ];
    const responses: SurveyResponse[] = [
      {
        memberId: 'sara',
        memberName: 'Sara',
        meanings: {},
        scenarios: ['A', 'A', 'A'],
        selfRating: 3,
        comfort: 4,
      },
      {
        memberId: 'marco',
        memberName: 'Marco',
        meanings: {},
        scenarios: ['A', 'A', 'A'],
        selfRating: 4,
        comfort: 4,
      },
    ];
    const analysis = analyze({
      members: members.slice(0, 2),
      terms: [],
      responses,
      turns,
      speakerMap: { Sara: 'sara', Marco: 'marco' },
    });
    const marco = buildNudges(analysis, responses).members.find((item) => item.memberId === 'marco');
    expect(marco?.nudges.some((line) => line.includes('You rated your contribution 4/5'))).toBe(true);
  });
});

describe('action plan', () => {
  it('keeps the severity order and stops at three actions', () => {
    const actions = buildActionPlan({
      misalignedLabels: ['On time', 'Everyone contributes'],
      balance: 62,
      uptakeSpread: 1,
      memberCount: 4,
      unanswered: 4,
      scenarioDimensions: ['Decision speed'],
    });
    expect(actions).toHaveLength(3);
    expect(actions[0]).toMatch(/On time and Everyone contributes/);
    expect(actions[1]).toMatch(/Speaking time is uneven/);
    expect(actions[2]).toMatch(/1 of 4 members were built on/);
  });
});
