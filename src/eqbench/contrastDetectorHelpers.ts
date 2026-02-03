export type PosType = 'verb' | 'noun' | 'adj' | 'adv' | 'all';

export type StreamPiece = [number, number, number, number];

export interface Interval {
  lo: number;
  hi: number;
  raw_start: number;
  raw_end: number;
  pattern_name: string;
  match_text: string;
}

// Map each POS tag to its replacement token
const POS_TAG_MAP: Record<string, string> = {
  // Verbs
  VB: 'VERB', VBD: 'VERB', VBG: 'VERB', VBN: 'VERB', VBP: 'VERB', VBZ: 'VERB',
  // Nouns
  NN: 'NOUN', NNS: 'NOUN', NNP: 'NOUN', NNPS: 'NOUN',
  // Adjectives
  JJ: 'ADJ', JJR: 'ADJ', JJS: 'ADJ',
  // Adverbs
  RB: 'ADV', RBR: 'ADV', RBS: 'ADV',
};

// Map posType to allowed replacement tokens
const POS_TYPE_ALLOWED: Record<PosType, Set<string> | null> = {
  verb: new Set(['VERB']),
  noun: new Set(['NOUN']),
  adj: new Set(['ADJ']),
  adv: new Set(['ADV']),
  all: null, // null means all replacements allowed
};

export function getPosReplacement(posTag: string | undefined, posType: PosType): string | null {
  if (!posTag) return null;

  const replacement = POS_TAG_MAP[posTag];
  if (!replacement) return null;

  const allowed = POS_TYPE_ALLOWED[posType];
  if (allowed === null || allowed.has(replacement)) {
    return replacement;
  }

  return null;
}

export function bisectRight(arr: number[], val: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if ((arr[mid] ?? 0) <= val) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function bisectLeft(arr: number[], val: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if ((arr[mid] ?? 0) < val) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function coveredSentenceRange(
  spans: Array<[number, number]>,
  start: number,
  end: number
): [number, number] | null {
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

export function mapStreamToRaw(
  pieces: StreamPiece[],
  streamStart: number,
  streamEnd: number,
  streamStarts?: number[],
  streamEnds?: number[]
): [number, number] | null {
  const starts = streamStarts ?? pieces.map(p => p[0]);
  const ends = streamEnds ?? pieces.map(p => p[1]);

  const i = bisectRight(ends, streamStart);
  const j = bisectLeft(starts, streamEnd) - 1;

  if (i >= pieces.length || j < i) {
    return null;
  }

  const relevantPieces = pieces.slice(i, j + 1);
  const rawS = Math.min(...relevantPieces.map(p => p[2]));
  const rawE = Math.max(...relevantPieces.map(p => p[3]));
  return [rawS, rawE];
}

export function collectStage1Candidates(
  tNorm: string,
  spans: Array<[number, number]>,
  regexes: Record<string, RegExp>,
  prefix: string
): Interval[] {
  const candidates: Interval[] = [];

  for (const [pname, pregex] of Object.entries(regexes)) {
    const matches = Array.from(tNorm.matchAll(pregex));

    for (const match of matches) {
      if (match.index === undefined) continue;

      const rs = match.index;
      const re = match.index + match[0].length;
      const rng = coveredSentenceRange(spans, rs, re);

      if (!rng) continue;

      const [lo, hi] = rng;
      candidates.push({
        lo,
        hi,
        raw_start: rs,
        raw_end: re,
        pattern_name: `${prefix}${pname}`,
        match_text: match[0].trim(),
      });
    }
  }

  return candidates;
}

export function collectStage2Candidates(
  tNorm: string,
  spans: Array<[number, number]>,
  regexes: Record<string, RegExp>,
  stream: string,
  pieces: StreamPiece[],
  prefix: string
): Interval[] {
  const candidates: Interval[] = [];
  const streamStarts = pieces.map(p => p[0]);
  const streamEnds = pieces.map(p => p[1]);

  for (const [pname, pregex] of Object.entries(regexes)) {
    const matches = Array.from(stream.matchAll(pregex));

    for (const match of matches) {
      if (match.index === undefined) continue;

      const mapRes = mapStreamToRaw(
        pieces,
        match.index,
        match.index + match[0].length,
        streamStarts,
        streamEnds
      );

      if (!mapRes) continue;

      const [rs, re] = mapRes;
      const rng = coveredSentenceRange(spans, rs, re);

      if (!rng) continue;

      const [lo, hi] = rng;
      candidates.push({
        lo,
        hi,
        raw_start: rs,
        raw_end: re,
        pattern_name: `${prefix}${pname}`,
        match_text: tNorm.substring(rs, re).trim(),
      });
    }
  }

  return candidates;
}
