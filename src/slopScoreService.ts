// src/services/slopScore/slopScoreService.ts

import type { SlopScoreResult } from './types.js';
import { stripHtml, stripMarkdown } from './textNormalizer.js';
import { computeEqBenchScore } from './eqbench/scorer.js';

export class UnsupportedLanguageError extends Error {
  constructor(public language: string) {
    super(`Unsupported language: ${language}. Only "en" is supported.`);
    this.name = 'UnsupportedLanguageError';
  }
}

// Deprecated but kept for compatibility with existing tests/handlers imports
export class InsufficientTextError extends Error {
  constructor(public actual: number, public minimum: number) {
    super(`Insufficient text for scoring. Got ${actual} words, need at least ${minimum}.`);
    this.name = 'InsufficientTextError';
  }
}

export class InputTooLargeError extends Error {
  constructor(public actual: number, public maximum: number, public unit: 'words' | 'chars' = 'words') {
    super(`Input too large. Got ${actual} ${unit}, maximum is ${maximum}.`);
    this.name = 'InputTooLargeError';
  }
}

export class SlopScoreService {
  private static instance: SlopScoreService;
  
  private constructor() {}
  
  public static getInstance(): SlopScoreService {
    if (!SlopScoreService.instance) {
      SlopScoreService.instance = new SlopScoreService();
    }
    return SlopScoreService.instance;
  }
  
  /**
   * Computes Slop Score using EQBench algorithm
   * 
   * Pipeline:
   * 1. Strip HTML
   * 2. Strip Markdown
   * 3. Compute score using EQBench pipeline (tokenization -> scoring -> normalization)
   */
  public async computeScoreFromText(
    text: string,
    language: string
  ): Promise<SlopScoreResult> {
    const startTime = Date.now();
    
    if (language !== 'en') {
      throw new UnsupportedLanguageError(language);
    }
    
    // 1. Pre-process: Strip HTML, then markdown
    const htmlStripped = stripHtml(text);
    const plainText = stripMarkdown(htmlStripped);

    // 2. Compute score using EQBench pipeline
    // Pass htmlStripped as rawText so formatting tropes (em-dashes, bold bullets)
    // can be detected before markdown stripping destroys those signals
    const result = await computeEqBenchScore(plainText, htmlStripped);
    
    return {
      ...result,
      computeMs: Date.now() - startTime,
    };
  }
  
  public static resetInstance(): void {
    SlopScoreService.instance = undefined as any;
  }
}

export const slopScoreService = SlopScoreService.getInstance();
