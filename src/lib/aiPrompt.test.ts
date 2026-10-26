import { describe, expect, it } from 'vitest';
import { analyzeSession } from './analysis';
import { buildAiPrompt } from './aiPrompt';
import { createDemoSession } from './demoData';
import { createEmptySession } from './types';

describe('AI prompt', () => {
  it('includes the charter, alignment, participation, uptake, transcript, and the coaching ask', () => {
    const session = createDemoSession();
    const prompt = buildAiPrompt(session, analyzeSession(session));

    expect(prompt).toContain('Team Atlas will deliver work on time');
    expect(prompt).toContain('On time — Misaligned');
    expect(prompt).toContain('Quality work — Aligned');
    expect(prompt).toContain('Marco:');
    expect(prompt).toMatch(/words \(\d+%\)/);
    expect(prompt).toContain('survey local business');
    expect(prompt).toContain('Idea uptake:');
    expect(prompt).toContain('We should survey local business owners');
    expect(prompt).toContain('tone of the conversation');
    expect(prompt).toContain('who sets the agenda');
    expect(prompt).toContain('missed opportunities');
    expect(prompt).toContain('Exactly 5 coaching suggestions');
    expect(prompt).toContain('Prof. Lee');
    expect(prompt.toLowerCase()).not.toContain('comfort');
    expect(prompt).not.toContain('demo-lena');
  });

  it('says what is missing instead of inventing a meeting', () => {
    const prompt = buildAiPrompt(createEmptySession(), analyzeSession(createEmptySession()));
    expect(prompt).toContain('No charter was pasted.');
    expect(prompt).toContain('No transcript was added.');
    expect(prompt).toContain('Exactly 5 coaching suggestions');
  });
});
