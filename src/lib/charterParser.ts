/**
 * Finds vague charter terms by matching the term library, including synonyms.
 * Matching is case-insensitive and uses whole words, so "agree" does not hit "agreement"
 * and "done" does not hit "condone". Longer phrases are tried first ("on time" before a shorter piece).
 */

import { TERM_LIBRARY } from './termLibrary';
import type { CharterTerm } from './types';

export interface TermHit {
  term: CharterTerm;
  /** The sentence (or line) that contained the match. */
  sentence: string;
  /** The exact letters from the charter, kept so the UI can highlight them. */
  match: string;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Break the charter into sentences and bullet lines. A block with no period stays intact. */
export function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  for (const line of text.split(/\n+/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    for (const part of trimmed.split(/(?<=[.!?])\s+/)) {
      const sentence = part.trim();
      if (sentence) sentences.push(sentence);
    }
  }
  return sentences;
}

function matchSynonym(sentence: string, synonym: string): string | null {
  const phrase = synonym.trim();
  if (!phrase) return null;
  const pattern = phrase.split(/\s+/).map(escapeRegex).join('\\s+');
  const found = new RegExp(`\\b${pattern}\\b`, 'i').exec(sentence);
  return found ? found[0] : null;
}

/**
 * Scan `charterText` for library terms. Each term is returned at most once,
 * with the first sentence that contained its longest matching synonym.
 */
export function findVagueTerms(
  charterText: string,
  library: readonly CharterTerm[] = TERM_LIBRARY,
): TermHit[] {
  const sentences = splitSentences(charterText);
  const hits: TermHit[] = [];

  for (const term of library) {
    const synonyms = [...term.synonyms].sort((a, b) => b.length - a.length);
    let hit: TermHit | null = null;
    for (const sentence of sentences) {
      for (const synonym of synonyms) {
        const match = matchSynonym(sentence, synonym);
        if (match) {
          hit = { term, sentence, match };
          break;
        }
      }
      if (hit) break;
    }
    if (hit) hits.push(hit);
  }

  return hits;
}
