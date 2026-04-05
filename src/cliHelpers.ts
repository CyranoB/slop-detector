import type { EqBenchScoreResult } from './eqbench/scorer.js';

export type CliInput =
  | { mode: 'help' }
  | { mode: 'missing' }
  | { mode: 'stdin' }
  | { mode: 'file'; filePath: string };

export function getCliInput(args: string[]): CliInput {
  if (args.includes('--help') || args.includes('-h')) {
    return { mode: 'help' };
  }

  if (args.length === 0) {
    return { mode: 'missing' };
  }

  if (args[0] === '-') {
    return { mode: 'stdin' };
  }

  return { mode: 'file', filePath: args[0] ?? '' };
}

export function getInterpretation(slopScore: number): string {
  if (slopScore < 20) {
    return 'Interpretation: Very human-like, natural writing';
  }
  if (slopScore < 40) {
    return 'Interpretation: Mostly human with some AI characteristics';
  }
  if (slopScore < 60) {
    return 'Interpretation: Mixed characteristics, unclear origin';
  }
  if (slopScore < 80) {
    return 'Interpretation: Likely AI-generated with some editing';
  }
  return 'Interpretation: Strong AI signature, minimal human intervention';
}

function renderHitList(lines: string[], header: string, hits: Array<[string, number]>, limit: number): void {
  if (hits.length === 0) return;
  lines.push('', header);
  for (const [text, count] of hits.slice(0, limit)) {
    lines.push(`  "${text}": ${count}×`);
  }
}

function renderContrastMatches(lines: string[], matches: EqBenchScoreResult['details']['contrastMatches']): void {
  if (matches.length === 0) return;
  lines.push('', 'Contrast Patterns Found:');
  for (const match of matches.slice(0, 5)) {
    lines.push(`  Pattern: ${match.pattern_name}`);
    lines.push(`  Match: "${match.match_text}"`);
    if (match.sentence && match.sentence.length < 150) {
      lines.push(`  Sentence: "${match.sentence}"`);
    }
    lines.push('');
  }
}

function renderTropeMatches(lines: string[], matches: EqBenchScoreResult['details']['tropeMatches']): void {
  if (matches.length === 0) return;
  lines.push('', 'AI Tropes Detected:');
  for (const match of matches.slice(0, 10)) {
    lines.push(`  [${match.category}] ${match.trope_name}: "${match.match_text}"`);
  }
  if (matches.length > 10) {
    lines.push(`  ... and ${matches.length - 10} more`);
  }
}

export function renderScoreOutput(result: EqBenchScoreResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('=== SLOP Score Analysis ===');
  lines.push('');
  lines.push(`Final Score: ${result.slopScore}/100`);
  lines.push(`Word Count: ${result.wordCount}`);
  lines.push(`Character Count: ${result.charCount}`);
  lines.push('');
  lines.push('Component Metrics:');
  lines.push(`  Word Score: ${result.metrics.slop_list_matches_per_1k_words.toFixed(2)} per 1k words`);
  lines.push(`  Trigram Score: ${result.metrics.slop_trigram_matches_per_1k_words.toFixed(2)} per 1k words`);
  lines.push(`  Contrast Pattern Score: ${result.metrics.not_x_but_y_per_1k_chars.toFixed(2)} per 1k chars`);
  lines.push(`  Trope Pattern Score: ${result.metrics.trope_patterns_per_1k_chars.toFixed(2)} per 1k chars`);

  renderHitList(lines, 'Top Slop Words:', result.details.wordHits, 10);
  renderHitList(lines, 'Top Slop Trigrams:', result.details.trigramHits, 5);
  renderContrastMatches(lines, result.details.contrastMatches);
  renderTropeMatches(lines, result.details.tropeMatches);

  lines.push('---');
  lines.push('');
  lines.push(getInterpretation(result.slopScore));
  lines.push('');

  return lines.join('\n');
}
