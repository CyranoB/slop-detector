// src/services/slopScore/eqbench/contrastDetector.ts

import winkPosTagger from 'wink-pos-tagger';
import { normalizeText, sentenceSpans } from './tokenizer.js';
import { STAGE1_REGEXES } from './regexesStage1.js';
import { STAGE2_REGEXES } from './regexesStage2.js';

// Initialize tagger
const tagger = winkPosTagger();

// POS Tag sets matching EQBench logic
const VERB_TAGS = new Set(['VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ']);
const NOUN_TAGS = new Set(['NN', 'NNS', 'NNP', 'NNPS']);
const ADJ_TAGS = new Set(['JJ', 'JJR', 'JJS']);
const ADV_TAGS = new Set(['RB', 'RBR', 'RBS']);

interface PosToken {
  value: string;
  tag: string;
  pos: string;
  lemma?: string;
}

// Binary search helpers
function bisectRight(arr: number[], val: number): number {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if ((arr[mid] ?? 0) <= val) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function bisectLeft(arr: number[], val: number): number {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if ((arr[mid] ?? 0) < val) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function coveredSentenceRange(spans: Array<[number, number]>, start: number, end: number): [number, number] | null {
  if (!spans.length || start >= end) return null;

  const starts = spans.map(s => s[0]);
  const ends = spans.map(s => s[1]);

  const lo = bisectRight(ends, start);
  const hi = bisectLeft(starts, end) - 1;

  if (lo >= spans.length || hi < 0 || lo > hi) {
    return null;
  }

  return [lo, hi];
}

interface Interval {
  lo: number;
  hi: number;
  raw_start: number;
  raw_end: number;
  pattern_name: string;
  match_text: string;
}

function mergeIntervals(items: Interval[]): Interval[] {
  if (!items.length) return [];

  const itemsSorted = items.slice().sort((a, b) => {
    if (a.lo !== b.lo) return a.lo - b.lo;
    if (a.hi !== b.hi) return a.hi - b.hi;
    return a.raw_start - b.raw_start;
  });

  const merged: Interval[] = [];
  const firstItem = itemsSorted[0];
  if (!firstItem) return merged;
  
  let cur: Interval = { ...firstItem };

  for (let i = 1; i < itemsSorted.length; i++) {
    const it = itemsSorted[i];
    if (!it) continue;
    
    if (it.lo <= cur.hi) {
      cur.hi = Math.max(cur.hi, it.hi);
      cur.raw_end = Math.max(cur.raw_end, it.raw_end);
    } else {
      merged.push(cur);
      cur = { ...it };
    }
  }
  merged.push(cur);

  return merged;
}

function tagStreamWithOffsets(text: string, posType: string = 'verb') {
  const tagged: PosToken[] = tagger.tagSentence(text);
  
  const parts: string[] = [];
  const pieces: number[][] = []; // [streamStart, streamEnd, rawStart, rawEnd]
  let streamPos = 0;
  let rawPos = 0;

  for (let i = 0; i < tagged.length; i++) {
    const token = tagged[i];
    if (!token) continue;
    
    const posTag = token.pos;
    const value = token.value;

    // Find token in original text
    const tokenStart = text.indexOf(value, rawPos);
    if (tokenStart === -1) {
      // Fallback if we can't find it (shouldn't happen with simple tokenization)
      rawPos += value.length;
      continue;
    }

    // Map token to POS tag if applicable
    let out = value;
    if (posTag) {
      if (posType === 'verb' && VERB_TAGS.has(posTag)) {
        out = 'VERB';
      } else if (posType === 'noun' && NOUN_TAGS.has(posTag)) {
        out = 'NOUN';
      } else if (posType === 'adj' && ADJ_TAGS.has(posTag)) {
        out = 'ADJ';
      } else if (posType === 'adv' && ADV_TAGS.has(posTag)) {
        out = 'ADV';
      } else if (posType === 'all') {
        if (VERB_TAGS.has(posTag)) out = 'VERB';
        else if (NOUN_TAGS.has(posTag)) out = 'NOUN';
        else if (ADJ_TAGS.has(posTag)) out = 'ADJ';
        else if (ADV_TAGS.has(posTag)) out = 'ADV';
      }
    }

    parts.push(out);
    const outLen = out.length;
    pieces.push([streamPos, streamPos + outLen, tokenStart, tokenStart + value.length]);
    streamPos += outLen;
    rawPos = tokenStart + value.length;

    // Add space between tokens (except last)
    if (i < tagged.length - 1) {
      const nextToken = tagged[i + 1];
      if (nextToken) {
        const nextPos = text.indexOf(nextToken.value, rawPos);
        if (nextPos > rawPos) {
          const whitespace = text.substring(rawPos, nextPos);
          parts.push(whitespace);
          pieces.push([streamPos, streamPos + whitespace.length, rawPos, nextPos]);
          streamPos += whitespace.length;
          rawPos = nextPos;
        } else {
          // Add single space inferred if not found
          parts.push(' ');
          pieces.push([streamPos, streamPos + 1, rawPos, rawPos]);
          streamPos += 1;
        }
      }
    }
  }

  return {
    stream: parts.join(''),
    pieces: pieces
  };
}

export interface ContrastMatch {
  sentence: string;
  pattern_name: string;
  match_text: string;
  sentence_count: number;
}

export interface ContrastScoreResult {
  hits: number;
  chars: number;
  rate_per_1k: number;
  matches: ContrastMatch[];
}

export function extractContrastMatches(text: string): ContrastMatch[] {
  const tNorm = normalizeText(text);
  const spans = sentenceSpans(tNorm);
  const candidates: Interval[] = [];

  // Stage 1: Run surface regexes on raw text
  for (const [pname, pregex] of Object.entries(STAGE1_REGEXES)) {
    const matches = Array.from(tNorm.matchAll(pregex));

    for (const match of matches) {
      if (match.index === undefined) continue;
      
      const rs = match.index;
      const re = match.index + match[0].length;
      const rng = coveredSentenceRange(spans, rs, re);

      if (rng) {
        const [lo, hi] = rng;
        candidates.push({
          lo,
          hi,
          raw_start: rs,
          raw_end: re,
          pattern_name: `S1_${pname}`,
          match_text: match[0].trim(),
        });
      }
    }
  }

  // Stage 2: Run POS-based regexes on tagged stream
  if (Object.keys(STAGE2_REGEXES).length > 0) {
    const { stream, pieces } = tagStreamWithOffsets(tNorm, 'verb');
    
    const streamStarts = pieces.map(p => p[0]!);
    const streamEnds = pieces.map(p => p[1]!);

    const streamToRaw = (ss: number, se: number): [number, number] | null => {
      const i = bisectRight(streamEnds, ss);
      const j = bisectLeft(streamStarts, se) - 1;

      if (i >= pieces.length || j < i) {
        return null;
      }

      // pieces[i] is [number, number, number, number]
      const relevantPieces = pieces.slice(i, j + 1);
      const rawS = Math.min(...relevantPieces.map(p => p[2]!));
      const rawE = Math.max(...relevantPieces.map(p => p[3]!));
      return [rawS, rawE];
    };

    for (const [pname, pregex] of Object.entries(STAGE2_REGEXES)) {
      const matches = Array.from(stream.matchAll(pregex));

      for (const match of matches) {
        if (match.index === undefined) continue;
        
        const mapRes = streamToRaw(match.index, match.index + match[0].length);

        if (mapRes) {
          const [rs, re] = mapRes;
          const rng = coveredSentenceRange(spans, rs, re);

          if (rng) {
            const [lo, hi] = rng;
            candidates.push({
              lo,
              hi,
              raw_start: rs,
              raw_end: re,
              pattern_name: `S2_${pname}`,
              match_text: tNorm.substring(rs, re).trim(),
            });
          }
        }
      }
    }
  }

  // Merge overlapping intervals
  const merged = mergeIntervals(candidates);

  // Build results with full sentence spans
  const results: ContrastMatch[] = [];
  for (const it of merged) {
    const sLo = it.lo;
    const sHi = it.hi;
    const sentenceSpan = sHi - sLo + 1;

    const blockStart = spans[sLo]![0];
    const blockEnd = spans[sHi]![1];

    const result = {
      sentence: tNorm.substring(blockStart, blockEnd).trim(),
      pattern_name: it.pattern_name,
      match_text: it.match_text,
      sentence_count: sentenceSpan
    };
    results.push(result);
  }

  return results;
}

export function scoreContrast(text: string): ContrastScoreResult {
  const matches = extractContrastMatches(text);
  const chars = text.length;
  const rate = chars > 0 ? (matches.length * 1000.0 / chars) : 0.0;

  return {
    hits: matches.length,
    chars,
    rate_per_1k: rate,
    matches
  };
}
