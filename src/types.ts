// src/services/slopScore/types.ts

export interface ContrastMatch {
  pattern_name: string;
  match_text: string;
}

export interface SlopScoreResult {
  slopScore: number;
  computeMs: number;
  charCount: number;
  wordCount: number;
  metrics?: {
    slop_list_matches_per_1k_words: number;
    slop_trigram_matches_per_1k_words: number;
    not_x_but_y_per_1k_chars: number;
  };
  details?: {
    wordHits: Array<[string, number]>;
    trigramHits: Array<[string, number]>;
    contrastMatches: ContrastMatch[];
  };
}

export interface SlopScoreTextInput {
  text: string;
  language: string;
}

export interface NormalizedText {
  text: string;
  charCount: number;
  wordCount: number;
  tokens: string[];
}

// Deprecated but kept for compatibility if needed elsewhere
export interface SlopAssets {
  words: Set<string>;
  trigrams: Set<string>;
  version: string;
}

export interface SubScores {
  wordScore: number;
  trigramScore: number;
  patternScore: number;
}
