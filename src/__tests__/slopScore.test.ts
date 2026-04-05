// src/__tests__/unit/slopScore/slopScore.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  SlopScoreService, 
  UnsupportedLanguageError 
} from '../slopScoreService.js';

describe('SlopScoreService Integration', () => {
  beforeEach(() => {
    SlopScoreService.resetInstance();
  });

  it('should reject non-English language', async () => {
    const service = SlopScoreService.getInstance();
    await expect(service.computeScoreFromText('some text', 'fr'))
      .rejects.toThrow(UnsupportedLanguageError);
  });

  it('should compute score for user sample text (EQBench alignment check)', async () => {
    const service = SlopScoreService.getInstance();
    const text = "In today’s ever-evolving digital landscape, it’s important to note that innovation is changing everything. This article will explore key insights that can help you unlock success.";
    
    const result = await service.computeScoreFromText(text, 'en');
    
    // Score changed from ~61.2 to ~51 after adding trope detection
    // and rebalancing weights from 60/25/15 to 50/20/12/18
    expect(result.slopScore).toBeCloseTo(51, 0);
    expect(result.metrics).toBeDefined();
    expect(result.metrics?.trope_patterns_per_1k_chars).toBeDefined();
    expect(result.details).toBeDefined();
    expect(result.details?.tropeMatches).toBeDefined();
  });

  it('should strip HTML before scoring', async () => {
    const service = SlopScoreService.getInstance();
    const html = "<p>In today’s <strong>ever-evolving</strong> digital landscape</p>";
    const plain = "In today’s ever-evolving digital landscape";
    
    const resultHtml = await service.computeScoreFromText(html, 'en');
    const resultPlain = await service.computeScoreFromText(plain, 'en');
    
    // Scores might slightly differ if stripHtml leaves extra whitespace, but should be very close
    expect(resultHtml.slopScore).toBeCloseTo(resultPlain.slopScore, 1);
  });
});
