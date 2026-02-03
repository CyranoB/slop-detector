import { describe, it, expect } from 'vitest';

import { sentenceSpans } from '../eqbench/tokenizer.js';
import {
  collectStage1Candidates,
  collectStage2Candidates,
  getPosReplacement,
  mapStreamToRaw,
  type StreamPiece,
} from '../eqbench/contrastDetectorHelpers.js';

describe('contrastDetectorHelpers', () => {
  it('maps POS tags to replacement tokens', () => {
    expect(getPosReplacement('VB', 'verb')).toBe('VERB');
    expect(getPosReplacement('NN', 'noun')).toBe('NOUN');
    expect(getPosReplacement('JJ', 'adj')).toBe('ADJ');
    expect(getPosReplacement('RB', 'adv')).toBe('ADV');
    expect(getPosReplacement('NN', 'verb')).toBeNull();
    expect(getPosReplacement(undefined, 'all')).toBeNull();
  });

  it('maps stream positions back to raw positions', () => {
    const pieces: StreamPiece[] = [
      [0, 4, 0, 5],
      [4, 5, 5, 6],
      [5, 9, 6, 11],
    ];

    expect(mapStreamToRaw(pieces, 0, 4)).toEqual([0, 5]);
    expect(mapStreamToRaw(pieces, 0, 9)).toEqual([0, 11]);
    expect(mapStreamToRaw(pieces, 6, 9)).toEqual([6, 11]);
    expect(mapStreamToRaw(pieces, 9, 10)).toBeNull();
  });

  it('collects stage 1 regex candidates within sentence spans', () => {
    const text = 'We not only ship, but also support.';
    const spans = sentenceSpans(text);
    const regexes = {
      only: /not only[\s\S]*?but also/gi,
    };

    const candidates = collectStage1Candidates(text, spans, regexes, 'S1_');
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.pattern_name).toBe('S1_only');
  });

  it('collects stage 2 regex candidates using stream mapping', () => {
    const text = 'hello world';
    const spans = sentenceSpans(text);
    const stream = 'VERB NOUN';
    const pieces: StreamPiece[] = [
      [0, 4, 0, 5],
      [4, 5, 5, 6],
      [5, 9, 6, 11],
    ];
    const regexes = {
      pair: /VERB NOUN/g,
    };

    const candidates = collectStage2Candidates(text, spans, regexes, stream, pieces, 'S2_');
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.pattern_name).toBe('S2_pair');
    expect(candidates[0]?.match_text).toBe('hello world');
  });
});
