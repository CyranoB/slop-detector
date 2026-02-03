// src/services/slopScore/eqbench/contrastDetector.ts

import winkPosTagger from 'wink-pos-tagger';
import { normalizeText, sentenceSpans } from './tokenizer.js';
import { STAGE1_REGEXES } from './regexesStage1.js';
import { STAGE2_REGEXES } from './regexesStage2.js';
import {
  collectStage1Candidates,
  collectStage2Candidates,
  getPosReplacement,
  type Interval,
  type PosType,
  type StreamPiece,
} from './contrastDetectorHelpers.js';

// Initialize tagger
const tagger = winkPosTagger();

interface PosToken {
  value: string;
  tag: string;
  pos: string;
  lemma?: string;
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

function tagStreamWithOffsets(text: string, posType: PosType = 'verb') {
  const tagged: PosToken[] = tagger.tagSentence(text);
  
  const parts: string[] = [];
  const pieces: StreamPiece[] = []; // [streamStart, streamEnd, rawStart, rawEnd]
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
    const replacement = getPosReplacement(posTag, posType);
    const out = replacement ?? value;

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
  candidates.push(...collectStage1Candidates(tNorm, spans, STAGE1_REGEXES, 'S1_'));

  // Stage 2: Run POS-based regexes on tagged stream
  if (Object.keys(STAGE2_REGEXES).length > 0) {
    const { stream, pieces } = tagStreamWithOffsets(tNorm, 'verb');

    candidates.push(...collectStage2Candidates(tNorm, spans, STAGE2_REGEXES, stream, pieces, 'S2_'));
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
