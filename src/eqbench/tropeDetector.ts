// src/eqbench/tropeDetector.ts - Detects AI writing tropes beyond contrast patterns

import { sentenceSpans } from './tokenizer.js';
import {
  PHRASE_PATTERNS,
  REGEX_PATTERNS,
  EM_DASH_THRESHOLD,
  BOLD_FIRST_BULLET_REGEX,
  BOLD_FIRST_BULLET_THRESHOLD,
  UNICODE_DECORATION_CHARS,
  UNICODE_DECORATION_THRESHOLD,
  ANAPHORA_MIN_RUN,
  SHORT_FRAGMENT_WORD_LIMIT,
  SHORT_FRAGMENT_DENSITY_THRESHOLD,
  TRICOLON_REGEX,
  TRICOLON_DENSITY_THRESHOLD,
  type TropeCategory,
} from './tropePatterns.js';

export interface TropeMatch {
  trope_name: string;
  category: TropeCategory;
  match_text: string;
}

export interface TropeScoreResult {
  hits: number;
  chars: number;
  rate_per_1k: number;
  matches: TropeMatch[];
}

/**
 * Detect phrase-based tropes via case-insensitive substring matching.
 */
function detectPhrases(text: string): TropeMatch[] {
  const matches: TropeMatch[] = [];
  const lower = text.toLowerCase();

  for (const pattern of PHRASE_PATTERNS) {
    for (const phrase of pattern.phrases) {
      let searchFrom = 0;
      while (true) {
        const idx = lower.indexOf(phrase, searchFrom);
        if (idx === -1) break;
        matches.push({
          trope_name: pattern.trope_name,
          category: pattern.category,
          match_text: text.substring(idx, idx + phrase.length),
        });
        searchFrom = idx + phrase.length;
      }
    }
  }

  return matches;
}

/**
 * Detect regex-based tropes on normalized text.
 */
function detectRegexPatterns(text: string): TropeMatch[] {
  const matches: TropeMatch[] = [];

  for (const pattern of REGEX_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      matches.push({
        trope_name: pattern.trope_name,
        category: pattern.category,
        match_text: match[0].trim(),
      });
    }
  }

  return matches;
}

/**
 * Detect em-dash overuse in raw text (before normalization replaces them).
 */
function detectEmDashAddiction(rawText: string): TropeMatch[] {
  const matches: TropeMatch[] = [];
  const chars = rawText.length;
  if (chars === 0) return matches;

  // Count em-dashes (U+2014) and double-hyphens used as em-dashes
  let count = 0;
  const emDashRegex = /\u2014|(?<!\w)--(?!\w)/g;
  let m;
  while ((m = emDashRegex.exec(rawText)) !== null) {
    count++;
  }

  const rate = (count * 1000) / chars;
  if (rate > EM_DASH_THRESHOLD.threshold) {
    matches.push({
      trope_name: EM_DASH_THRESHOLD.trope_name,
      category: EM_DASH_THRESHOLD.category,
      match_text: `${count} em-dashes in ${chars} chars (${rate.toFixed(1)}/1k)`,
    });
  }

  return matches;
}

/**
 * Detect bold-first bullet pattern in raw markdown.
 */
function detectBoldFirstBullets(rawText: string): TropeMatch[] {
  const matches: TropeMatch[] = [];
  BOLD_FIRST_BULLET_REGEX.lastIndex = 0;
  let count = 0;
  let m;
  while ((m = BOLD_FIRST_BULLET_REGEX.exec(rawText)) !== null) {
    count++;
  }

  if (count >= BOLD_FIRST_BULLET_THRESHOLD.threshold) {
    matches.push({
      trope_name: BOLD_FIRST_BULLET_THRESHOLD.trope_name,
      category: BOLD_FIRST_BULLET_THRESHOLD.category,
      match_text: `${count} bold-first bullet points`,
    });
  }

  return matches;
}

/**
 * Detect excessive unicode decoration in raw text.
 */
function detectUnicodeDecoration(rawText: string): TropeMatch[] {
  const matches: TropeMatch[] = [];
  const chars = rawText.length;
  if (chars === 0) return matches;

  UNICODE_DECORATION_CHARS.lastIndex = 0;
  let count = 0;
  while (UNICODE_DECORATION_CHARS.exec(rawText) !== null) {
    count++;
  }

  const rate = (count * 1000) / chars;
  if (rate > UNICODE_DECORATION_THRESHOLD.threshold) {
    matches.push({
      trope_name: UNICODE_DECORATION_THRESHOLD.trope_name,
      category: UNICODE_DECORATION_THRESHOLD.category,
      match_text: `${count} unicode decorations in ${chars} chars (${rate.toFixed(1)}/1k)`,
    });
  }

  return matches;
}

/**
 * Detect anaphora abuse: 3+ consecutive sentences starting with the same word.
 */
function detectAnaphora(text: string): TropeMatch[] {
  const matches: TropeMatch[] = [];
  const spans = sentenceSpans(text);
  if (spans.length < ANAPHORA_MIN_RUN) return matches;

  // Extract first word of each sentence
  const firstWords: string[] = [];
  for (const [start, end] of spans) {
    const sentence = text.substring(start, end).trim();
    const firstWord = sentence.match(/^[a-zA-Z]+/);
    firstWords.push(firstWord ? firstWord[0].toLowerCase() : '');
  }

  // Find runs of same first word
  let runStart = 0;
  for (let i = 1; i <= firstWords.length; i++) {
    if (i < firstWords.length && firstWords[i] === firstWords[runStart] && firstWords[runStart] !== '') {
      continue;
    }
    const runLen = i - runStart;
    if (runLen >= ANAPHORA_MIN_RUN) {
      const word = firstWords[runStart];
      matches.push({
        trope_name: 'anaphora_abuse',
        category: 'sentence_structure',
        match_text: `${runLen} consecutive sentences starting with "${word}"`,
      });
    }
    runStart = i;
  }

  return matches;
}

/**
 * Detect excessive short punchy fragments.
 */
function detectShortFragments(text: string): TropeMatch[] {
  const matches: TropeMatch[] = [];
  const spans = sentenceSpans(text);
  if (spans.length < 4) return matches; // Need enough sentences to judge

  let shortCount = 0;
  for (const [start, end] of spans) {
    const sentence = text.substring(start, end).trim();
    const words = sentence.split(/\s+/).filter(w => w.length > 0);
    if (words.length > 0 && words.length <= SHORT_FRAGMENT_WORD_LIMIT) {
      shortCount++;
    }
  }

  const density = shortCount / spans.length;
  if (density > SHORT_FRAGMENT_DENSITY_THRESHOLD) {
    matches.push({
      trope_name: 'short_punchy_fragments',
      category: 'sentence_structure',
      match_text: `${shortCount}/${spans.length} sentences are short fragments (${(density * 100).toFixed(0)}%)`,
    });
  }

  return matches;
}

/**
 * Detect tricolon overuse.
 */
function detectTricolonAbuse(text: string): TropeMatch[] {
  const matches: TropeMatch[] = [];
  const chars = text.length;
  if (chars === 0) return matches;

  TRICOLON_REGEX.lastIndex = 0;
  let count = 0;
  while (TRICOLON_REGEX.exec(text) !== null) {
    count++;
  }

  const rate = (count * 1000) / chars;
  if (rate > TRICOLON_DENSITY_THRESHOLD.threshold) {
    matches.push({
      trope_name: TRICOLON_DENSITY_THRESHOLD.trope_name,
      category: TRICOLON_DENSITY_THRESHOLD.category,
      match_text: `${count} tricolon patterns (${rate.toFixed(1)}/1k chars)`,
    });
  }

  return matches;
}

/**
 * Main entry point: score text for AI writing tropes.
 *
 * @param normalizedText - text after HTML/markdown stripping
 * @param rawText - original text preserving markdown formatting and em-dashes
 */
export function scoreTropes(normalizedText: string, rawText: string): TropeScoreResult {
  const allMatches: TropeMatch[] = [];

  // Phrase-based detection (on normalized text)
  allMatches.push(...detectPhrases(normalizedText));

  // Regex-based detection (on normalized text)
  allMatches.push(...detectRegexPatterns(normalizedText));

  // Formatting detection (on raw text)
  allMatches.push(...detectEmDashAddiction(rawText));
  allMatches.push(...detectBoldFirstBullets(rawText));
  allMatches.push(...detectUnicodeDecoration(rawText));

  // Statistical detection (on normalized text)
  allMatches.push(...detectAnaphora(normalizedText));
  allMatches.push(...detectShortFragments(normalizedText));
  allMatches.push(...detectTricolonAbuse(normalizedText));

  const chars = normalizedText.length;
  const rate = chars > 0 ? (allMatches.length * 1000.0) / chars : 0.0;

  return {
    hits: allMatches.length,
    chars,
    rate_per_1k: rate,
    matches: allMatches,
  };
}
