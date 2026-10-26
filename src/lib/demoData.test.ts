import { describe, expect, it } from 'vitest';
import { analyzeSession } from './analysis';
import { createDemoSession } from './demoData';
import { buildNudges } from './nudges';
import { parseTranscript } from './transcriptParser';
import { normalizeSession } from './storage';

describe('demo team', () => {
  const session = createDemoSession();
  const analysis = analyzeSession(session);
  const nudges = buildNudges(analysis, session.responses);

  it('parses a class-project transcript of about 40 turns and ignores the professor', () => {
    const parsed = parseTranscript(session.transcriptText);
    expect(parsed.error).toBeNull();
    expect(parsed.speakers).toEqual(['Sara', 'Marco', 'Lena', 'David', 'Prof. Lee']);
    expect(parsed.turns.length).toBeGreaterThanOrEqual(36);
    expect(parsed.turns.length).toBeLessThanOrEqual(45);
    expect(analysis.turns.some((turn) => turn.name === 'Prof. Lee')).toBe(false);
  });

  it('makes on time and everyone contributes misaligned, communication partly aligned, and quality aligned', () => {
    const status = Object.fromEntries(analysis.terms.map((term) => [term.termId, term.status]));
    expect(status['on-time']).toBe('misaligned');
    expect(status['everyone-contributes']).toBe('misaligned');
    expect(status.communication).toBe('partly');
    expect(status['quality-work']).toBe('aligned');
    expect(analysis.terms[0]?.status).toBe('misaligned');
    expect(analysis.sharedMeaning).not.toBeNull();
  });

  it('makes Marco dominant, Lena quiet, and her business-survey idea picked up twice', () => {
    const share = Object.fromEntries(
      analysis.participation.members.map((row) => [row.name, Math.round(row.wordShare * 100)]),
    );
    const marco = analysis.participation.members.find((row) => row.name === 'Marco');
    const lena = analysis.participation.members.find((row) => row.name === 'Lena');
    const david = analysis.participation.members.find((row) => row.name === 'David');
    const lenaUptake = analysis.uptake.members.find((row) => row.name === 'Lena');
    const saraUptake = analysis.uptake.members.find((row) => row.name === 'Sara');
    expect(marco?.dominant).toBe(true);
    expect(lena?.quiet).toBe(true);
    expect(share.Marco).toBeGreaterThanOrEqual(40);
    expect(share.Marco).toBeLessThanOrEqual(55);
    expect(share.Lena).toBeLessThanOrEqual(12);
    expect(lenaUptake?.ideasPickedUp).toBeGreaterThanOrEqual(1);
    expect(lenaUptake?.examples.length).toBeGreaterThanOrEqual(2);
    expect(lenaUptake?.examples.some((example) => example.phrase.includes('survey'))).toBe(true);
    expect(saraUptake?.builtOnOthers).toBeGreaterThanOrEqual(2);
    expect(david?.wordShare).toBeLessThan(0.125);
  });

  it('leaves two of David’s questions unanswered and records an approximate cut-off', () => {
    const davidQuestions = analysis.unanswered.filter((item) => item.name === 'David');
    expect(davidQuestions).toHaveLength(2);
    expect(analysis.interruptions.some((item) => item.kind === 'cutoff' && item.fromName === 'Marco')).toBe(true);
  });

  it('shows every report finding: scenario splits, a self-rating gap, a private comfort note, and three actions', () => {
    expect(analysis.scenarios.filter((scenario) => scenario.split).length).toBeGreaterThanOrEqual(1);
    expect(analysis.scenarios[0]?.note).toMatch(/decide fast/);
    const david = nudges.members.find((item) => item.name === 'David');
    const sara = nudges.members.find((item) => item.name === 'Sara');
    expect(david?.nudges.some((line) => line.includes('You rated your contribution 4/5'))).toBe(true);
    expect(sara?.nudges.some((line) => line.includes('Quality work'))).toBe(true);
    expect(nudges.teamNotes[0]).toMatch(/less comfortable/);
    expect(nudges.teamNotes.join(' ')).not.toMatch(/Lena/);
    expect(nudges.actions).toHaveLength(3);
    expect(nudges.actions[0]).toMatch(/On time/);
    expect(nudges.actions[1]).toMatch(/built on/);
    expect(nudges.members.every((item) => item.nudges.length >= 2 && item.nudges.length <= 3)).toBe(true);
  });

  it('round-trips through storage', () => {
    const restored = normalizeSession(JSON.parse(JSON.stringify(session)) as unknown);
    expect(restored.teamName).toBe('Team Atlas');
    expect(restored.members).toHaveLength(4);
    expect(restored.responses).toHaveLength(4);
    expect(restored.selectedTerms).toHaveLength(5);
    expect(restored.speakerMap['Prof. Lee']).toBe('ignore');
    expect(restored.assessments['demo-lena']?.notes).toMatch(/local business/);
  });
});
