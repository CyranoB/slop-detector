import { describe, it, expect } from 'vitest';

import { getCliInput, getInterpretation, renderScoreOutput } from '../cliHelpers.js';

describe('cliHelpers', () => {
  it('detects help flag before other args', () => {
    expect(getCliInput(['--help'])).toEqual({ mode: 'help' });
    expect(getCliInput(['-h', 'file.txt'])).toEqual({ mode: 'help' });
  });

  it('detects missing args', () => {
    expect(getCliInput([])).toEqual({ mode: 'missing' });
  });

  it('detects stdin vs file input', () => {
    expect(getCliInput(['-'])).toEqual({ mode: 'stdin' });
    expect(getCliInput(['input.md'])).toEqual({ mode: 'file', filePath: 'input.md' });
  });

  it('returns interpretation by score thresholds', () => {
    expect(getInterpretation(0)).toBe('Interpretation: Very human-like, natural writing');
    expect(getInterpretation(25)).toBe('Interpretation: Mostly human with some AI characteristics');
    expect(getInterpretation(55)).toBe('Interpretation: Mixed characteristics, unclear origin');
    expect(getInterpretation(75)).toBe('Interpretation: Likely AI-generated with some editing');
    expect(getInterpretation(95)).toBe('Interpretation: Strong AI signature, minimal human intervention');
  });

  it('renders full output with optional sections', () => {
    const output = renderScoreOutput({
      slopScore: 42.1,
      wordCount: 100,
      charCount: 420,
      metrics: {
        slop_list_matches_per_1k_words: 12.345,
        slop_trigram_matches_per_1k_words: 6.789,
        not_x_but_y_per_1k_chars: 0.1234,
      },
      details: {
        wordHits: [['delve', 2]],
        trigramHits: [['as a result', 1]],
        contrastMatches: [{
          pattern_name: 'S1_not_x_but_y',
          match_text: 'not X but Y',
          sentence: 'not X but Y',
          sentence_count: 1,
        }]
      }
    });

    expect(output).toContain('=== SLOP Score Analysis ===');
    expect(output).toContain('Final Score: 42.1/100');
    expect(output).toContain('Word Score: 12.35 per 1k words');
    expect(output).toContain('Trigram Score: 6.79 per 1k words');
    expect(output).toContain('Contrast Pattern Score: 0.12 per 1k chars');
    expect(output).toContain('Top Slop Words:');
    expect(output).toContain('"delve": 2×');
    expect(output).toContain('Top Slop Trigrams:');
    expect(output).toContain('"as a result": 1×');
    expect(output).toContain('Contrast Patterns Found:');
    expect(output).toContain('Pattern: S1_not_x_but_y');
    expect(output).toContain('Match: "not X but Y"');
    expect(output).toContain('Interpretation: Mixed characteristics, unclear origin');
  });
});
