// src/eqbench/scorer.ts - EQBench SLOP Score Algorithm

import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { wordsOnlyLower, alphaTokens } from './tokenizer.js';
import { scoreContrast, type ContrastScoreResult } from './contrastDetector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to assets
const ASSETS_DIR = path.resolve(__dirname, '../assets');
const SLOP_LIST_PATH = path.join(ASSETS_DIR, 'slop_list.json');
const SLOP_TRIGRAMS_PATH = path.join(ASSETS_DIR, 'slop_list_trigrams.json');
const LEADERBOARD_PATH = path.join(ASSETS_DIR, 'leaderboard_results.json');

// Constants
const SCORING_CONSTANTS = {
  WEIGHT_WORD: 0.60,
  WEIGHT_PATTERN: 0.25,
  WEIGHT_TRIGRAM: 0.15,
  WORD_MULTIPLIER: 1000,
  TRIGRAM_MULTIPLIER: 1000,
};

interface SlopAssets {
  words: Set<string>;
  trigrams: Set<string>;
  normalizationRanges: Record<string, { min: number; max: number }>;
}

let loadedAssets: SlopAssets | null = null;

async function loadAssets(): Promise<SlopAssets> {
  if (loadedAssets) return loadedAssets;

  let wordsJson: string;
  let trigramsJson: string;
  let leaderboardJson: string;

  try {
    [wordsJson, trigramsJson, leaderboardJson] = await Promise.all([
      fs.readFile(SLOP_LIST_PATH, 'utf-8'),
      fs.readFile(SLOP_TRIGRAMS_PATH, 'utf-8'),
      fs.readFile(LEADERBOARD_PATH, 'utf-8'),
    ]);
  } catch (error) {
    throw new Error(
      `Failed to load SLOP scoring assets from ${ASSETS_DIR}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Parse slop lists (format: [["word"], ["word2"], ...])
  const wordsRaw = JSON.parse(wordsJson);
  const trigramsRaw = JSON.parse(trigramsJson);

  const words = new Set<string>();
  for (const item of wordsRaw) {
    if (Array.isArray(item) && item[0]) words.add(item[0].toLowerCase());
  }

  const trigrams = new Set<string>();
  for (const item of trigramsRaw) {
    if (Array.isArray(item) && item[0]) trigrams.add(item[0].toLowerCase());
  }

  // Parse leaderboard for normalization ranges
  const leaderboard = JSON.parse(leaderboardJson);
  const results = leaderboard.results || [];

  const metrics = {
    slop_words: [] as number[],
    slop_trigrams: [] as number[],
    contrast: [] as number[],
  };

  for (const res of results) {
    if (res.metrics) {
      metrics.slop_words.push(res.metrics.slop_list_matches_per_1k_words || 0);
      metrics.slop_trigrams.push(res.metrics.slop_trigram_matches_per_1k_words || 0);
      metrics.contrast.push(res.metrics.not_x_but_y_per_1k_chars || 0);
    }
  }

  const computeRange = (values: number[]) => {
    if (values.length === 0) return { min: 0, max: 1 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    return {
      min: min - range * 0.1,
      max: max + range * 0.1
    };
  };

  const normalizationRanges = {
    slop_words: computeRange(metrics.slop_words),
    slop_trigrams: computeRange(metrics.slop_trigrams),
    contrast: computeRange(metrics.contrast),
  };

  loadedAssets = { words, trigrams, normalizationRanges };
  return loadedAssets;
}

export interface EqBenchScoreResult {
  slopScore: number;
  wordCount: number;
  charCount: number;
  metrics: {
    slop_list_matches_per_1k_words: number;
    slop_trigram_matches_per_1k_words: number;
    not_x_but_y_per_1k_chars: number;
  };
  details: {
    wordHits: Array<[string, number]>;
    trigramHits: Array<[string, number]>;
    contrastMatches: any[];
  };
}

function normalizeValue(value: number, range: { min: number; max: number } | undefined): number {
  if (!range) return 0;
  const normalized = (value - range.min) / (range.max - range.min);
  return Math.max(0, Math.min(1, normalized));
}

export async function computeEqBenchScore(text: string): Promise<EqBenchScoreResult> {
  const assets = await loadAssets();
  
  // 1. Tokenization (EQBench pipeline)
  const toks0 = wordsOnlyLower(text);
  const tokens = alphaTokens(toks0);
  const nTokens = tokens.length || 1; // Avoid division by zero

  // 2. Word & Trigram Scoring
  let wordHitCount = 0;
  let trigramHitCount = 0;
  const wordHitMap = new Map<string, number>();
  const trigramHitMap = new Map<string, number>();

  // Word hits
  for (const t of tokens) {
    if (assets.words.has(t)) {
      wordHitCount++;
      wordHitMap.set(t, (wordHitMap.get(t) || 0) + 1);
    }
  }

  // Trigram hits
  if (tokens.length >= 3) {
    for (let i = 0; i < tokens.length - 2; i++) {
      const tg = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
      if (assets.trigrams.has(tg)) {
        trigramHitCount++;
        trigramHitMap.set(tg, (trigramHitMap.get(tg) || 0) + 1);
      }
    }
  }

  const wordScore = (wordHitCount / nTokens) * SCORING_CONSTANTS.WORD_MULTIPLIER;
  const trigramScore = (trigramHitCount / nTokens) * SCORING_CONSTANTS.TRIGRAM_MULTIPLIER;

  // 3. Contrast Scoring
  const contrastResult = scoreContrast(text);
  const contrastScore = contrastResult.rate_per_1k;

  // 4. Normalization & Weighting
  const normWords = normalizeValue(wordScore, assets.normalizationRanges.slop_words);
  const normTrigrams = normalizeValue(trigramScore, assets.normalizationRanges.slop_trigrams);
  const normContrast = normalizeValue(contrastScore, assets.normalizationRanges.contrast);

  const rawSlopScore = (
    normWords * SCORING_CONSTANTS.WEIGHT_WORD +
    normContrast * SCORING_CONSTANTS.WEIGHT_PATTERN +
    normTrigrams * SCORING_CONSTANTS.WEIGHT_TRIGRAM
  ) * 100;

  // Round to 1 decimal place
  const slopScore = Math.round(rawSlopScore * 10) / 10;

  return {
    slopScore,
    wordCount: nTokens,
    charCount: text.length,
    metrics: {
      slop_list_matches_per_1k_words: wordScore,
      slop_trigram_matches_per_1k_words: trigramScore,
      not_x_but_y_per_1k_chars: contrastScore,
    },
    details: {
      wordHits: Array.from(wordHitMap.entries()).sort((a, b) => b[1] - a[1]),
      trigramHits: Array.from(trigramHitMap.entries()).sort((a, b) => b[1] - a[1]),
      contrastMatches: contrastResult.matches,
    }
  };
}
