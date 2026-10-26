import { describe, expect, it } from 'vitest';
import { parseTranscript } from './transcriptParser';

describe('Name: text', () => {
  it('keeps a continuation line on the previous speaker and does not merge across someone else', () => {
    const result = parseTranscript(
      [
        'Sara: I think we should start with the survey.',
        'It can be short.',
        'Jordan: I agree.',
        'Sara: Then let us do it.',
      ].join('\n'),
    );

    expect(result.error).toBeNull();
    expect(result.speakers).toEqual(['Sara', 'Jordan']);
    expect(result.turns.map((turn) => turn.speaker)).toEqual(['Sara', 'Jordan', 'Sara']);
    expect(result.turns[0]).toMatchObject({
      index: 0,
      text: 'I think we should start with the survey. It can be short.',
      wordCount: 12,
    });
    expect(result.turns[2]?.text).toBe('Then let us do it.');
  });

  it('joins back-to-back turns from the same speaker', () => {
    const result = parseTranscript('Sara: Hello\nSara: team\nJordan: Hi there');
    expect(result.turns).toHaveLength(2);
    expect(result.turns[0]).toMatchObject({ speaker: 'Sara', text: 'Hello team', wordCount: 2 });
  });

  it('drops a turn with no words and strips a BOM', () => {
    const result = parseTranscript('\uFEFFSara: \r\nJordan: Hello there.\r\nLena: Yes.');
    expect(result.error).toBeNull();
    expect(result.speakers).toEqual(['Jordan', 'Lena']);
    expect(result.turns.every((turn) => turn.wordCount >= 1)).toBe(true);
  });

  it('accepts apostrophes and hyphens in names', () => {
    const result = parseTranscript("O'Neil: Hello there.\nMary-Jane: Glad you came.");
    expect(result.speakers).toEqual(["O'Neil", 'Mary-Jane']);
  });
});

describe('WebVTT and SRT', () => {
  it('reads voice tags and Name: lines, and keeps cue times in seconds', () => {
    const result = parseTranscript(`WEBVTT

00:00:01.000 --> 00:00:04.500
<v Sara>Hello team

00:00:05.000 --> 00:00:08.000
Jordan: Glad to be here.

00:00:08.500 --> 00:00:12.000
<v.deep Sara>Let us begin.
`);

    expect(result.error).toBeNull();
    expect(result.speakers).toEqual(['Sara', 'Jordan']);
    expect(result.turns[0]).toMatchObject({ speaker: 'Sara', text: 'Hello team', startSec: 1, endSec: 4.5 });
    expect(result.turns[1]).toMatchObject({ speaker: 'Jordan', text: 'Glad to be here.', startSec: 5, endSec: 8 });
    expect(result.turns[2]).toMatchObject({ speaker: 'Sara', text: 'Let us begin.', startSec: 8.5, endSec: 12 });
  });

  it('merges consecutive cues from the same speaker and spans their times', () => {
    const result = parseTranscript(`WEBVTT

00:00:01.000 --> 00:00:02.000
<v Sara>Hello

00:00:02.000 --> 00:00:04.000
<v Sara>team

00:00:05.000 --> 00:00:06.000
<v Jordan>Hi
`);

    expect(result.turns).toHaveLength(2);
    expect(result.turns[0]).toMatchObject({
      speaker: 'Sara',
      text: 'Hello team',
      startSec: 1,
      endSec: 4,
      wordCount: 2,
    });
  });

  it('parses SRT cue numbers and comma timestamps', () => {
    const result = parseTranscript(`1
00:00:01,000 --> 00:00:03,000
Sara: First point

2
00:00:04,000 --> 00:00:06,000
Jordan: Second point
`);

    expect(result.error).toBeNull();
    expect(result.turns[0]).toMatchObject({ speaker: 'Sara', text: 'First point', startSec: 1, endSec: 3 });
    expect(result.turns[1]).toMatchObject({ speaker: 'Jordan', text: 'Second point', startSec: 4, endSec: 6 });
  });
});

describe('Otter', () => {
  it('takes the speaker from the timestamp line and the words from the lines after it', () => {
    const result = parseTranscript(`Sara  0:42
I think we should start with the survey.
It can be short.

Jordan  1:05
Sounds good.
`);

    expect(result.error).toBeNull();
    expect(result.speakers).toEqual(['Sara', 'Jordan']);
    expect(result.turns[0]).toMatchObject({
      speaker: 'Sara',
      text: 'I think we should start with the survey. It can be short.',
      startSec: 42,
      wordCount: 12,
    });
    expect(result.turns[1]).toMatchObject({ speaker: 'Jordan', text: 'Sounds good.', startSec: 65 });
  });
});

describe('errors', () => {
  it('explains the formats when fewer than two speakers are found', () => {
    const result = parseTranscript('Sara: I am the only one talking today.');
    expect(result.speakers).toEqual(['Sara']);
    expect(result.error).toMatch(/Fewer than 2 speakers/);
    expect(result.error).toMatch(/\.vtt/);
    expect(result.error).toMatch(/0:42/);
  });

  it('asks for text when the transcript is empty', () => {
    expect(parseTranscript('  \n').error).toMatch(/Paste a transcript/);
    expect(parseTranscript('').turns).toEqual([]);
  });
});
