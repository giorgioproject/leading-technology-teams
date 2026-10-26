/**
 * Turns pasted meeting text into speaker turns.
 * Three shapes are recognized: `Name: text`, Zoom/Teams WebVTT or SRT cues,
 * and Otter lines (`Name  0:42` with the words on the following lines).
 * Consecutive turns from the same person are joined. A turn with no words is dropped.
 */

import type { Turn } from './types';

export interface TranscriptParseResult {
  turns: Turn[];
  /** Speaker names in the order they first speak. */
  speakers: string[];
  /** Set when the text cannot support a report yet. The turns may still be partial. */
  error: string | null;
}

interface RawTurn {
  speaker: string;
  text: string;
  startSec?: number;
  endSec?: number;
}

const NAME_LINE = /^([A-Z][\w .'-]{0,40}?):\s+(.*)$/;
const OTTER_LINE = /^(.+?)\s+(\d{1,2}:\d{2}(?::\d{2})?)$/;
const CUE_LINE = /^((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{1,3})\s+-->\s+((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{1,3})/;

export const TRANSCRIPT_FORMAT_ERROR =
  'Fewer than 2 speakers were found. Use lines like “Sara: text”, a Zoom or Teams .vtt or .srt file, or Otter lines like “Sara  0:42” with the words on the next line.';

function countWords(text: string): number {
  const words = text.trim().split(/\s+/).filter((word) => word !== '');
  return words.length;
}

/** `00:01:02.500`, `00:01:02,500`, or `1:02` → seconds. */
function toSeconds(stamp: string): number {
  const clean = stamp.trim().replace(',', '.');
  const parts = clean.split(':');
  if (parts.length === 3) {
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    const seconds = Number(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  }
  if (parts.length === 2) {
    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);
    return minutes * 60 + seconds;
  }
  return 0;
}

function isCaption(text: string): boolean {
  return /^WEBVTT\b/m.test(text) || /\d{2}:\d{2}[.,]\d{1,3}\s+-->\s+/.test(text);
}

function isOtter(lines: string[]): boolean {
  let otter = 0;
  let named = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (OTTER_LINE.test(trimmed)) otter += 1;
    if (NAME_LINE.test(trimmed)) named += 1;
  }
  return otter > 0 && otter > named;
}

function extractCaptionLine(line: string): { speaker: string | null; text: string } {
  const voice = /<v(?:\.[\w-]+)?\s+([^>]+)>/i.exec(line);
  let speaker: string | null = null;
  let rest = line;
  if (voice?.[1] !== undefined && voice.index !== undefined) {
    speaker = voice[1].trim();
    rest = line.slice(voice.index + voice[0].length);
  }
  rest = rest.replace(/<\/?[^>]+>/g, '').trim();
  if (!speaker) {
    const named = NAME_LINE.exec(rest);
    if (named?.[1]) {
      speaker = named[1].trim();
      rest = (named[2] ?? '').trim();
    }
  }
  return { speaker, text: rest };
}

function parseCaptions(text: string): RawTurn[] {
  const lines = text.split('\n');
  const turns: RawTurn[] = [];
  let index = 0;

  while (index < lines.length) {
    const cue = CUE_LINE.exec((lines[index] ?? '').trim());
    if (!cue?.[1] || !cue[2]) {
      index += 1;
      continue;
    }
    const startSec = toSeconds(cue[1]);
    const endSec = toSeconds(cue[2]);
    index += 1;

    const cueLines: string[] = [];
    while (index < lines.length) {
      const next = (lines[index] ?? '').trim();
      if (next === '') break;
      if (CUE_LINE.test(next)) break;
      const following = (lines[index + 1] ?? '').trim();
      if (/^\d+$/.test(next) && CUE_LINE.test(following)) break;
      cueLines.push(lines[index] ?? '');
      index += 1;
    }

    let speaker: string | null = null;
    const pieces: string[] = [];
    for (const cueLine of cueLines) {
      const extracted = extractCaptionLine(cueLine.trim());
      if (!speaker && extracted.speaker) speaker = extracted.speaker;
      if (extracted.text) pieces.push(extracted.text);
    }
    if (speaker && pieces.length > 0) {
      turns.push({ speaker, text: pieces.join(' '), startSec, endSec });
    }
  }

  return turns;
}

function parseNamed(lines: string[]): RawTurn[] {
  const turns: RawTurn[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const named = NAME_LINE.exec(trimmed);
    if (named?.[1]) {
      turns.push({ speaker: named[1].trim(), text: (named[2] ?? '').trim() });
      continue;
    }
    const previous = turns[turns.length - 1];
    if (!previous) continue;
    previous.text = `${previous.text} ${trimmed}`.trim();
  }
  return turns;
}

function parseOtter(lines: string[]): RawTurn[] {
  const turns: RawTurn[] = [];
  let current: RawTurn | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const otter = OTTER_LINE.exec(trimmed);
    if (otter?.[1] && otter[2]) {
      if (current) turns.push(current);
      current = { speaker: otter[1].trim(), text: '', startSec: toSeconds(otter[2]) };
      continue;
    }
    if (!current) continue;
    current.text = `${current.text} ${trimmed}`.trim();
  }

  if (current) turns.push(current);
  return turns;
}

function finalize(rawTurns: RawTurn[]): Turn[] {
  const merged: RawTurn[] = [];
  for (const turn of rawTurns) {
    const previous = merged[merged.length - 1];
    if (previous && previous.speaker === turn.speaker) {
      previous.text = `${previous.text} ${turn.text}`.trim();
      if (previous.startSec === undefined && turn.startSec !== undefined) previous.startSec = turn.startSec;
      if (turn.endSec !== undefined) previous.endSec = turn.endSec;
      continue;
    }
    merged.push({ ...turn });
  }

  const turns: Turn[] = [];
  for (const turn of merged) {
    const wordCount = countWords(turn.text);
    if (wordCount < 1) continue;
    const next: Turn = {
      index: turns.length,
      speaker: turn.speaker,
      text: turn.text,
      wordCount,
    };
    if (turn.startSec !== undefined) next.startSec = turn.startSec;
    if (turn.endSec !== undefined) next.endSec = turn.endSec;
    turns.push(next);
  }
  return turns;
}

function speakersInOrder(turns: Turn[]): string[] {
  const speakers: string[] = [];
  for (const turn of turns) {
    if (!speakers.includes(turn.speaker)) speakers.push(turn.speaker);
  }
  return speakers;
}

/** Parse a transcript. Fewer than two speakers sets `error` and still returns any turns found. */
export function parseTranscript(raw: string): TranscriptParseResult {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!text) {
    return { turns: [], speakers: [], error: 'Paste a transcript to find the speakers.' };
  }

  const lines = text.split('\n');
  const rawTurns = isCaption(text) ? parseCaptions(text) : isOtter(lines) ? parseOtter(lines) : parseNamed(lines);
  const turns = finalize(rawTurns);
  const speakers = speakersInOrder(turns);
  return {
    turns,
    speakers,
    error: speakers.length < 2 ? TRANSCRIPT_FORMAT_ERROR : null,
  };
}
