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
    
    // Expectation based on manual check with EQBench logic
    // We expect ~61.2
    expect(result.slopScore).toBeCloseTo(61.2, 0); // Allow +/- 0.5 (rounding differences)
    expect(result.metrics).toBeDefined();
    expect(result.details).toBeDefined();
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
