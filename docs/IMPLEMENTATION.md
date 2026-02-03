# SLOP Score Implementation Plan

## Overview

This document details the step-by-step implementation plan for adding a SLOP (AI-generated text detection) scoring feature to the Vantage Draft application. The feature computes a deterministic score indicating how "AI-like" article text appears.

---

## Oracle Review Summary (v2 Revisions)

The following changes were made based on Oracle architectural review:

### P0 Changes (Critical)
1. **Single Authority for DB Access**: Handler owns article fetch + ownership; service is a "pure scorer" that accepts pre-assembled text
2. **Explicit Scaling Constants**: All rate→score multipliers defined in a single `SCORING_CONSTANTS` object

### P1 Changes (Important)
3. **Token-Window Pattern Detection**: Replace regex with O(n) token scanning for "not-X-but-Y" patterns
4. **Test Layer Separation**: Unit tests use injected tiny assets; integration tests use full assets with range expectations

### P2 Changes (Nice-to-Have)
5. **File-Based Asset Loading**: Use JSON files + build copy (simpler, smaller bundle than embedded TS)
6. **MAX_CHARS Guard**: Add character limit (50,000) in addition to word limit

---

## Phase 1: Service Layer Implementation

### 1.1 Create Service Directory Structure

**Location**: `src/services/slopScore/`

```
src/services/slopScore/
├── index.ts                    # Public exports
├── slopScoreService.ts         # Main service class (singleton)
├── textNormalizer.ts           # Text normalization utilities
├── slopDetector.ts             # Core detection algorithms
├── assets/
│   ├── slop_list.json          # Slop word list
│   └── slop_list_trigrams.json # Slop trigram list
└── types.ts                    # TypeScript interfaces
```

### 1.2 Type Definitions (`types.ts`)

```typescript
export interface SlopScoreResult {
  slopScore: number;           // 0.0-100.0, one decimal precision
  computeMs: number;           // Processing time in milliseconds
  charCount: number;           // Character count after normalization
  wordCount: number;           // Word count after normalization
}

// Service accepts pre-assembled text (handler owns DB fetch)
export interface SlopScoreTextInput {
  text: string;                // Raw article content (HTML/Markdown allowed)
  language: string;            // Only "en" supported
}

export interface NormalizedText {
  text: string;
  charCount: number;
  wordCount: number;
  tokens: string[];            // Lowercase words for matching
}

export interface SlopAssets {
  words: Set<string>;          // Slop words (lowercase)
  trigrams: Set<string>;       // Slop trigrams (lowercase, space-joined)
  version: string;             // Asset version for logging
}

export interface SubScores {
  wordScore: number;           // 0-100, slop word frequency
  trigramScore: number;        // 0-100, slop trigram frequency  
  patternScore: number;        // 0-100, not-x-but-y pattern frequency
}

// Internal: for logging/debugging only (not in API response)
export interface DetailedSlopResult extends SlopScoreResult {
  subScores: SubScores;
  assetVersion: string;
}
```

### 1.3 Text Normalizer (`textNormalizer.ts`)

**Purpose**: Strip HTML/Markdown, normalize Unicode, prepare text for scoring.

**Key Functions**:

```typescript
export function normalizeText(rawContent: string): NormalizedText {
  // 1. Strip HTML using html-to-text (reuse existing dependency)
  // 2. Strip Markdown formatting tokens (preserve visible text)
  // 3. Normalize Unicode (NFKC)
  // 4. Lowercase (locale-insensitive)
  // 5. Collapse whitespace
  // 6. Tokenize into words
  // Return: { text, charCount, wordCount, tokens }
}

export function stripHtml(html: string): string {
  // Use html-to-text with options:
  // - wordwrap: false
  // - preserveNewlines: false
  // - ignoreHref: true
  // - skip images
}

export function stripMarkdown(text: string): string {
  // Remove: # headings, **bold**, *italic*, [links](url), ```code```, etc.
  // Preserve: visible text content
}

export function tokenize(text: string): string[] {
  // Split on Unicode whitespace
  // Exclude pure punctuation tokens
  // Exclude emoji-only tokens
  // Return lowercase tokens
}
```

**Dependencies** (already installed):
- `html-to-text` (v9.0.5) - HTML stripping
- Native `String.prototype.normalize()` - Unicode NFKC

### 1.4 Slop Detector (`slopDetector.ts`)

**Purpose**: Core detection algorithms for slop words, trigrams, and patterns.

**Scoring Constants** (Single Source of Truth):

```typescript
// All calibration constants in one place for easy tuning
export const SCORING_CONSTANTS = {
  // Composite weights (must sum to 1.0)
  WEIGHT_WORD: 0.60,
  WEIGHT_PATTERN: 0.25,
  WEIGHT_TRIGRAM: 0.15,
  
  // Rate-to-score multipliers
  // A 5% slop word rate → score of 50 (5 * 1000 / 100 = 50)
  WORD_RATE_MULTIPLIER: 1000,
  
  // A 3% trigram match rate → score of 45 (3 * 1500 / 100 = 45)
  TRIGRAM_RATE_MULTIPLIER: 1500,
  
  // 2 patterns per 1000 words → score of 40 (2 * 20 = 40)
  PATTERN_PER_1K_WORDS_MULTIPLIER: 20,
  
  // Minimum evidence thresholds (prevent single-occurrence spikes)
  MIN_TOKENS_FOR_WORD_SCORE: 10,
  MIN_TRIGRAMS_FOR_TRIGRAM_SCORE: 5,
  MIN_WORDS_FOR_PATTERN_SCORE: 50,
  
  // Score caps
  MAX_SCORE: 100,
} as const;
```

**Key Functions**:

```typescript
export function computeWordScore(tokens: string[], slopWords: Set<string>): number {
  if (tokens.length < SCORING_CONSTANTS.MIN_TOKENS_FOR_WORD_SCORE) {
    return 0;
  }
  const matchCount = tokens.filter(t => slopWords.has(t)).length;
  const rate = matchCount / tokens.length;
  const rawScore = rate * SCORING_CONSTANTS.WORD_RATE_MULTIPLIER;
  return Math.min(rawScore, SCORING_CONSTANTS.MAX_SCORE);
}

export function computeTrigramScore(tokens: string[], slopTrigrams: Set<string>): number {
  if (tokens.length < 3) return 0;
  
  const trigrams: string[] = [];
  for (let i = 0; i <= tokens.length - 3; i++) {
    trigrams.push(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
  }
  
  if (trigrams.length < SCORING_CONSTANTS.MIN_TRIGRAMS_FOR_TRIGRAM_SCORE) {
    return 0;
  }
  
  const matchCount = trigrams.filter(t => slopTrigrams.has(t)).length;
  const rate = matchCount / trigrams.length;
  const rawScore = rate * SCORING_CONSTANTS.TRIGRAM_RATE_MULTIPLIER;
  return Math.min(rawScore, SCORING_CONSTANTS.MAX_SCORE);
}

// Token-window pattern detection (O(n), no regex backtracking risk)
export function computePatternScore(tokens: string[], wordCount: number): number {
  if (wordCount < SCORING_CONSTANTS.MIN_WORDS_FOR_PATTERN_SCORE) {
    return 0;
  }
  
  const patternCount = detectNotXButYPatterns(tokens);
  const per1kWords = (patternCount / wordCount) * 1000;
  const rawScore = per1kWords * SCORING_CONSTANTS.PATTERN_PER_1K_WORDS_MULTIPLIER;
  return Math.min(rawScore, SCORING_CONSTANTS.MAX_SCORE);
}

// Token-window scanning for "not just/only/merely/simply ... but" patterns
const PATTERN_MODIFIERS = new Set(['just', 'only', 'merely', 'simply']);
const MAX_WORDS_BETWEEN = 6; // Max words between modifier and "but"

export function detectNotXButYPatterns(tokens: string[]): number {
  let count = 0;
  
  for (let i = 0; i < tokens.length - 3; i++) {
    // Look for "not" followed by a modifier
    if (tokens[i] !== 'not') continue;
    if (!PATTERN_MODIFIERS.has(tokens[i + 1] || '')) continue;
    
    // Scan forward for "but" within window
    const maxJ = Math.min(i + 2 + MAX_WORDS_BETWEEN, tokens.length);
    for (let j = i + 2; j < maxJ; j++) {
      if (tokens[j] === 'but') {
        // Exclusion: skip if followed by "not" (e.g., "not just X but not Y")
        if (tokens[j + 1] === 'not') break;
        count++;
        break;
      }
    }
  }
  
  return count;
}

export function computeCompositeScore(subScores: SubScores): number {
  const raw = 
    (subScores.wordScore * SCORING_CONSTANTS.WEIGHT_WORD) +
    (subScores.patternScore * SCORING_CONSTANTS.WEIGHT_PATTERN) +
    (subScores.trigramScore * SCORING_CONSTANTS.WEIGHT_TRIGRAM);
  
  // Round to 1 decimal place
  return Math.round(raw * 10) / 10;
}
```

### 1.5 Main Service (`slopScoreService.ts`)

**Pattern**: Singleton service (following `ArticleReviewService` pattern)

**Key Design Decision**: Service is a "pure scorer" - accepts text input, returns score. Handler owns DB access and ownership checks. This eliminates double-fetch and keeps responsibilities clear.

```typescript
export class SlopScoreService {
  private static instance: SlopScoreService;
  private assets: SlopAssets | null = null;
  private readonly ASSET_VERSION = '1.0.0';
  
  // Thresholds
  private readonly MIN_CHARS = 100;
  private readonly MIN_WORDS = 20;
  private readonly MAX_WORDS = 7500;
  private readonly MAX_CHARS = 50000;  // Added per Oracle review
  
  private constructor() {}
  
  public static getInstance(): SlopScoreService {
    if (!SlopScoreService.instance) {
      SlopScoreService.instance = new SlopScoreService();
    }
    return SlopScoreService.instance;
  }
  
  private async loadAssets(): Promise<SlopAssets> {
    if (this.assets) return this.assets;
    
    // File-based loading with build copy (simpler than embedded TS)
    const wordsPath = path.join(__dirname, 'assets', 'slop_list.json');
    const trigramsPath = path.join(__dirname, 'assets', 'slop_list_trigrams.json');
    
    const [wordsJson, trigramsJson] = await Promise.all([
      fs.readFile(wordsPath, 'utf-8'),
      fs.readFile(trigramsPath, 'utf-8'),
    ]);
    
    this.assets = {
      words: new Set(JSON.parse(wordsJson).map((w: string) => w.toLowerCase())),
      trigrams: new Set(JSON.parse(trigramsJson).map((t: string) => t.toLowerCase())),
      version: this.ASSET_VERSION,
    };
    
    return this.assets;
  }
  
  /**
   * Compute SLOP score from raw text content.
   * Handler is responsible for fetching article content and verifying ownership.
   * 
   * @param text - Raw article content (HTML/Markdown/plain text)
   * @param language - Language code (only "en" supported)
   * @returns SlopScoreResult with score and metadata
   * @throws UnsupportedLanguageError, InsufficientTextError, InputTooLargeError
   */
  public async computeScoreFromText(
    text: string,
    language: string
  ): Promise<SlopScoreResult> {
    const startTime = Date.now();
    
    // 1. Validate language
    if (language !== 'en') {
      throw new UnsupportedLanguageError(language);
    }
    
    // 2. Normalize text
    const normalized = normalizeText(text);
    
    // 3. Validate text length (chars and words)
    if (normalized.charCount > this.MAX_CHARS) {
      throw new InputTooLargeError(normalized.wordCount, this.MAX_WORDS, 'chars');
    }
    if (normalized.charCount < this.MIN_CHARS || normalized.wordCount < this.MIN_WORDS) {
      throw new InsufficientTextError(normalized.wordCount, this.MIN_WORDS);
    }
    if (normalized.wordCount > this.MAX_WORDS) {
      throw new InputTooLargeError(normalized.wordCount, this.MAX_WORDS, 'words');
    }
    
    // 4. Load assets (cached)
    const assets = await this.loadAssets();
    
    // 5. Compute sub-scores (using token-based pattern detection)
    const subScores: SubScores = {
      wordScore: computeWordScore(normalized.tokens, assets.words),
      trigramScore: computeTrigramScore(normalized.tokens, assets.trigrams),
      patternScore: computePatternScore(normalized.tokens, normalized.wordCount),
    };
    
    // 6. Compute composite score
    const slopScore = computeCompositeScore(subScores);
    
    // 7. Return result
    return {
      slopScore,
      computeMs: Date.now() - startTime,
      charCount: normalized.charCount,
      wordCount: normalized.wordCount,
    };
  }
  
  // For testing: allow asset injection
  public setAssetsForTesting(assets: SlopAssets): void {
    this.assets = assets;
  }
  
  // For testing: reset singleton
  public static resetInstance(): void {
    SlopScoreService.instance = undefined as any;
  }
}

// Export singleton instance (matches existing codebase patterns)
export const slopScoreService = SlopScoreService.getInstance();

// Custom errors
export class UnsupportedLanguageError extends Error {
  constructor(public language: string) {
    super(`Unsupported language: ${language}. Only "en" is supported.`);
    this.name = 'UnsupportedLanguageError';
  }
}

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
```

---

## Phase 2: API Layer Implementation

### 2.1 Add Route to Articles Router

**File**: `src/api/articles/router.ts`

```typescript
// POST /api/articles/:id/slop-score
router.post(
  '/:id/slop-score',
  requireClerkAuth,
  ensureUserExists(),
  validate(slopScoreBodySchema, 'body'),
  slopScoreHandler
);
```

### 2.2 Add Validation Schema

**File**: `src/api/validation.ts` (add to existing)

```typescript
export const slopScoreBodySchema = z.object({
  language: z.string().min(2).max(10),
});
```

### 2.3 Implement Handler

**File**: `src/api/articles/handlers.ts` (add to existing)

**Key Design Decision**: Handler owns DB access and article content assembly. Service receives pre-assembled text. This eliminates double-fetch and makes responsibilities clear.

```typescript
import { 
  slopScoreService, 
  UnsupportedLanguageError, 
  InsufficientTextError, 
  InputTooLargeError 
} from '../../services/slopScore/index.js';

/**
 * Assemble article content from sections for SLOP scoring.
 * Uses editedContent if available, falls back to content.
 */
async function assembleArticleContent(articleId: string): Promise<string> {
  const sections = await articleService.getSections(articleId);
  
  return sections
    .sort((a: any, b: any) => a.sectionNumber - b.sectionNumber)
    .map((s: any) => s.content || '')  // content already contains editedContent if edited
    .filter((content: string) => content.trim().length > 0)
    .join('\n\n');
}

export async function slopScoreHandler(
  req: ClerkAuthRequest,
  res: Response
): Promise<void> {
  const { id: articleId } = req.params;
  const { language } = req.body;
  const userId = getClerkUserId(req);

  try {
    // 1. Verify article exists and user owns it (single authority)
    const article = await articleService.findById(articleId!, userId);
    if (!article) {
      res.status(404).json({
        success: false,
        error: 'Article not found',
        code: 'NOT_FOUND',
      });
      return;
    }
    
    // 2. Check ownership explicitly (findById may return for any user in some patterns)
    if (article.userId !== userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'FORBIDDEN',
      });
      return;
    }

    // 3. Assemble article content (handler owns this)
    const articleContent = await assembleArticleContent(articleId!);
    
    // 4. Compute SLOP score (service is pure scorer)
    const result = await slopScoreService.computeScoreFromText(articleContent, language);

    // 5. Log for observability (no raw content, include sub-scores for debugging)
    console.log('[slop-score]', {
      articleId,
      userId: userId.substring(0, 8) + '...',
      charCount: result.charCount,
      wordCount: result.wordCount,
      computeMs: result.computeMs,
      slopScore: result.slopScore,
    });

    // 6. Return success response
    res.json({
      success: true,
      data: {
        slopScore: result.slopScore,
      },
    });

  } catch (error) {
    // Handle domain-specific errors
    if (error instanceof UnsupportedLanguageError) {
      res.status(422).json({
        success: false,
        error: error.message,
        code: 'UNSUPPORTED_LANGUAGE',
      });
      return;
    }

    if (error instanceof InsufficientTextError) {
      res.status(422).json({
        success: false,
        error: error.message,
        code: 'INSUFFICIENT_TEXT',
      });
      return;
    }

    if (error instanceof InputTooLargeError) {
      res.status(413).json({
        success: false,
        error: error.message,
        code: 'INPUT_TOO_LARGE',
      });
      return;
    }

    // Generic error with error ID for correlation
    const errorId = `slop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.error(`[slop-score] Error [${errorId}]:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to compute SLOP score',
      code: 'SCORING_FAILURE',
      errorId,
    });
  }
}
```

---

## Phase 3: Asset Management

### 3.1 Asset Files

**Source**: From slop-score reference repository

**Files to include**:
- `slop_list.json` - Array of slop words (strings)
- `slop_list_trigrams.json` - Array of slop trigrams (strings)

**NOT included** (too large):
- `human_writing_profile.json` (~73MB)

### 3.2 Asset Loading Strategy

**Decision**: File-based loading + build copy step (per Oracle review)

**Rationale**:
- Simpler than embedded TS modules
- Smaller bundle size
- Easier to update assets without code changes
- Works well in Node.js environment (not targeting serverless/edge)

**Trade-offs**:
- Requires build step to copy assets
- Slightly slower first load (file I/O vs pre-compiled)

### 3.3 Build Integration

Add copy step to `package.json`:

```json
{
  "scripts": {
    "build": "tsc && npm run copy-slop-assets",
    "copy-slop-assets": "mkdir -p dist/services/slopScore/assets && cp src/services/slopScore/assets/*.json dist/services/slopScore/assets/"
  }
}
```

---

## Phase 4: Testing Strategy

### 4.1 Test Layer Separation (Per Oracle Review)

**Layer 1: Algorithm Unit Tests** - Inject tiny asset sets for exact expectations
**Layer 2: Asset Sanity Tests** - Full assets with range expectations

### 4.2 Unit Tests (Injected Assets)

**File**: `src/services/slopScore/__tests__/slopScore.test.ts`

```typescript
// Tiny test assets for deterministic unit tests
const TEST_ASSETS: SlopAssets = {
  words: new Set(['delve', 'tapestry', 'vibrant', 'synergy', 'paradigm']),
  trigrams: new Set(['it is important', 'to note that', 'in order to']),
  version: 'test-1.0',
};

describe('SlopScoreService', () => {
  beforeEach(() => {
    SlopScoreService.resetInstance();
    const service = SlopScoreService.getInstance();
    service.setAssetsForTesting(TEST_ASSETS);
  });

  describe('Text Normalization', () => {
    it('should strip HTML tags and decode entities');
    it('should remove Markdown formatting while preserving text');
    it('should normalize Unicode to NFKC');
    it('should collapse multiple whitespace');
    it('should tokenize correctly excluding punctuation');
    it('should handle plain text input unchanged');
    it('should handle mixed HTML/Markdown content');
  });

  describe('Word Score (with injected assets)', () => {
    it('should return exact score for known slop word density', () => {
      // 2 slop words in 20 tokens = 10% rate
      // 10% * 1000 (multiplier) = 100, capped at 100
      const tokens = ['the', 'delve', 'into', 'this', 'tapestry', ...fifteenNormalWords];
      expect(computeWordScore(tokens, TEST_ASSETS.words)).toBe(100);
    });
    
    it('should return 0 for text with no slop words');
    it('should return 0 for text below MIN_TOKENS threshold');
    it('should cap at 100');
  });

  describe('Trigram Score (with injected assets)', () => {
    it('should detect exact trigram matches');
    it('should handle text shorter than 3 words');
    it('should return 0 below MIN_TRIGRAMS threshold');
  });

  describe('Pattern Score (token-window detection)', () => {
    it('should detect "not just X but Y" patterns', () => {
      const tokens = ['this', 'is', 'not', 'just', 'a', 'product', 'but', 'a', 'solution'];
      expect(detectNotXButYPatterns(tokens)).toBe(1);
    });
    
    it('should detect "not only X but Y" patterns');
    it('should detect "not merely X but Y" patterns');
    it('should detect "not simply X but Y" patterns');
    it('should exclude "not just X but not Y" (double negation)');
    it('should handle multiple patterns in one text');
    it('should return 0 for text below MIN_WORDS threshold');
    it('should respect MAX_WORDS_BETWEEN window');
  });

  describe('Composite Score', () => {
    it('should apply exact weights: 60% word, 25% pattern, 15% trigram', () => {
      const subScores = { wordScore: 50, patternScore: 40, trigramScore: 30 };
      // (50 * 0.6) + (40 * 0.25) + (30 * 0.15) = 30 + 10 + 4.5 = 44.5
      expect(computeCompositeScore(subScores)).toBe(44.5);
    });
    
    it('should round to 1 decimal place');
    it('should be deterministic (same input = same output)');
  });

  describe('Edge Cases', () => {
    it('should reject empty text with InsufficientTextError');
    it('should reject text at exactly MIN_WORDS - 1');
    it('should accept text at exactly MIN_WORDS');
    it('should reject text at exactly MAX_WORDS + 1');
    it('should accept text at exactly MAX_WORDS');
    it('should reject text exceeding MAX_CHARS');
    it('should reject non-English with UnsupportedLanguageError');
    it('should handle emoji-only content');
    it('should handle code-block-only content');
  });
});
```

### 4.3 Asset Sanity Tests (Full Assets, Range Expectations)

**File**: `src/services/slopScore/__tests__/slopScoreAssets.test.ts`

```typescript
describe('SlopScoreService (Full Assets)', () => {
  beforeAll(async () => {
    // Let service load real assets
    SlopScoreService.resetInstance();
  });

  describe('Asset Loading', () => {
    it('should load slop words successfully (non-empty set)');
    it('should load slop trigrams successfully (non-empty set)');
    it('should cache assets after first load');
  });

  describe('Golden Fixtures (Range Expectations)', () => {
    it('should score low-slop text in range [0, 20]', async () => {
      const result = await slopScoreService.computeScoreFromText(
        FIXTURES.lowSlop.text,
        'en'
      );
      expect(result.slopScore).toBeGreaterThanOrEqual(0);
      expect(result.slopScore).toBeLessThanOrEqual(20);
    });

    it('should score high-slop text in range [50, 100]');
    it('should score pattern-heavy text in range [40, 80]');
    it('should produce consistent scores across runs (determinism)');
  });
});
```

### 4.4 Golden Test Fixtures

**File**: `src/services/slopScore/__tests__/fixtures.ts`

```typescript
export const FIXTURES = {
  lowSlop: {
    text: `The quarterly report indicates a 15% increase in customer acquisition
           compared to the previous period. Revenue grew by $2.3 million, driven
           primarily by expansion in the European market. Operating costs remained
           stable, with a slight decrease in marketing spend offset by increased
           investment in customer support infrastructure.`,
    expectedRange: [0, 20],
  },
  
  highSlop: {
    text: `Let's delve into this vibrant tapestry of innovation that's not just
           transforming but revolutionizing the industry landscape. This paradigm
           shift represents a synergy between cutting-edge technology and human
           ingenuity. It's important to note that these groundbreaking developments
           are not merely incremental but truly transformative.`,
    expectedRange: [50, 100],
  },
  
  patternHeavy: {
    text: `This solution is not just a product but a platform. It's not only
           innovative but revolutionary. The approach is not merely useful but
           essential. We're not simply improving but reimagining the entire
           experience.`,
    expectedRange: [40, 80],
  },
  
  trigramHeavy: {
    text: `It's important to note that in order to achieve success, we need to
           carefully consider all factors. It is worth mentioning that this
           approach allows us to effectively address the challenges at hand.`,
    expectedRange: [30, 60],
  },
  
  // Edge cases for error handling tests
  edgeCases: {
    empty: "",
    tooShort: "Hello world.",
    exactlyMinWords: "word ".repeat(20).trim(),
    exactlyMaxWords: "word ".repeat(7500).trim(),
    htmlContent: "<p><strong>Bold</strong> and <em>italic</em> text here.</p>".repeat(10),
    markdownContent: "# Heading\n\n**Bold** text with [link](url)\n\n".repeat(10),
    emojiOnly: "🚀💯🔥✨🎉".repeat(50),
    codeBlock: "```javascript\nconst x = 1;\nfunction test() { return x; }\n```".repeat(5),
    mixedLanguage: "This is English. これは日本語です. This is more English.",
  },
};
```

### 4.5 Integration Tests

**File**: `src/api/__tests__/slopScore.integration.test.ts`

```typescript
describe('POST /api/articles/:id/slop-score', () => {
  // Setup: create test user, test article with content
  
  describe('Success Cases', () => {
    it('should return numeric score for owned article with sufficient content');
    it('should return consistent scores for same content (determinism)');
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 for unauthenticated request');
    it('should return 403 for article not owned by user');
    it('should return 404 for non-existent article');
  });

  describe('Validation Errors', () => {
    it('should return 422 for unsupported language');
    it('should return 422 for article with insufficient text');
    it('should return 413 for article exceeding max words');
    it('should return 400 for missing language in request body');
  });

  describe('Edge Cases', () => {
    it('should handle article with empty sections gracefully');
    it('should handle article with HTML content');
    it('should handle article with Markdown content');
  });
});
```

---

## Phase 5: Implementation Checklist

### Service Layer
- [x] Create `src/services/slopScore/` directory structure
- [x] Implement `types.ts` with interfaces (including DetailedSlopResult)
- [x] Implement `textNormalizer.ts` with HTML/Markdown stripping
- [x] Implement `slopDetector.ts` with:
  - [x] SCORING_CONSTANTS object (all calibration values)
  - [x] computeWordScore with minimum evidence threshold
  - [x] computeTrigramScore with minimum evidence threshold
  - [x] detectNotXButYPatterns (token-window, O(n))
  - [x] computePatternScore with minimum evidence threshold
  - [x] computeCompositeScore
- [x] Implement `slopScoreService.ts`:
  - [x] Singleton pattern with reset for testing
  - [x] computeScoreFromText (pure scorer, no DB access)
  - [x] Asset loading with caching
  - [x] setAssetsForTesting hook
- [x] Add slop word list asset (`slop_list.json`)
- [x] Add slop trigram list asset (`slop_list_trigrams.json`)
- [x] Export public API from `index.ts`

### API Layer
- [x] Add validation schema `slopScoreBodySchema` to validation.ts
- [x] Implement `assembleArticleContent` helper in handlers.ts
- [x] Implement `slopScoreHandler` with:
  - [x] Single authority for article fetch + ownership check
  - [x] Explicit 403 path for ownership violation (mapped to 404 per codebase pattern)
  - [x] Error ID generation for 500 responses
- [x] Add route to articles router
- [x] Test error responses match spec (401/403/404/413/422/500)

### Testing
- [x] Create test assets (tiny word/trigram sets) for unit tests
- [x] Write unit tests for text normalization (7 cases)
- [x] Write unit tests for word score (4 cases with injected assets)
- [x] Write unit tests for trigram score (3 cases)
- [x] Write unit tests for pattern score (8 cases with token-window)
- [x] Write unit tests for composite score (3 cases)
- [x] Write unit tests for edge cases (9 cases)
- [x] Write asset sanity tests with full assets (range expectations)
- [x] Create golden test fixtures with realistic text samples
- [x] Write integration tests for API endpoint (11 cases)
- [x] Verify determinism test passes

### Observability
- [x] Add logging with fields: articleId, userId (truncated), charCount, wordCount, computeMs, slopScore
- [x] Add error ID to 500 responses for correlation
- [x] Verify no raw article content in logs

### Build & Deploy
- [x] Add `copy-slop-assets` script to package.json
- [x] Update build script to include asset copy
- [x] Verify assets are included in build output
- [x] Test in development environment
- [x] Run full test suite
- [x] Verify TypeScript compiles without errors

---

## API Contract Summary

### Endpoint
```
POST /api/articles/:id/slop-score
```

### Request
```json
{
  "language": "en"
}
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "slopScore": 42.5
  }
}
```

### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 401 | UNAUTHORIZED | Missing/invalid authentication |
| 403 | FORBIDDEN | User doesn't own article |
| 404 | NOT_FOUND | Article doesn't exist |
| 413 | INPUT_TOO_LARGE | Text exceeds 7500 words |
| 422 | UNSUPPORTED_LANGUAGE | Language is not "en" |
| 422 | INSUFFICIENT_TEXT | Text below 20 words |
| 500 | SCORING_FAILURE | Internal scoring error |

---

## Dependencies

### Existing (No Changes Needed)
- `html-to-text` (v9.0.5) - HTML to plain text
- `turndown` (v7.2.2) - HTML to Markdown (reference only)

### New Dependencies
- None required

---

## Estimated Implementation Time

| Phase | Effort |
|-------|--------|
| Phase 1: Service Layer | 4-6 hours |
| Phase 2: API Layer | 1-2 hours |
| Phase 3: Asset Management | 1 hour |
| Phase 4: Testing | 3-4 hours |
| **Total** | **9-13 hours** |

---

## Open Questions Resolved

1. **Minimum text thresholds**: MIN_CHARS=100, MIN_WORDS=20, MAX_CHARS=50000, MAX_WORDS=7500
2. **Scoring math** (explicit constants in SCORING_CONSTANTS):
   - Word rate: matches/totalTokens × WORD_RATE_MULTIPLIER (1000), capped at 100
   - Trigram rate: matches/totalTrigrams × TRIGRAM_RATE_MULTIPLIER (1500), capped at 100
   - Pattern rate: (patterns/wordCount × 1000) × PATTERN_PER_1K_WORDS_MULTIPLIER (20), capped at 100
   - Composite: 60% word + 25% pattern + 15% trigram, rounded to 1 decimal
3. **Minimum evidence thresholds** (prevent single-occurrence spikes):
   - MIN_TOKENS_FOR_WORD_SCORE = 10
   - MIN_TRIGRAMS_FOR_TRIGRAM_SCORE = 5
   - MIN_WORDS_FOR_PATTERN_SCORE = 50
4. **Pattern detection**: Token-window scanning (O(n), no regex backtracking risk)
5. **Asset loading**: File-based with build copy (simpler, smaller bundle)
6. **Service responsibilities**: Pure scorer (accepts text, returns score); handler owns DB access

---

## Appendix: Oracle Review Summary

**Reviewer**: Oracle (GPT-5.2)
**Status**: Revise (Minor)
**Date**: 2026-01-11

### Key Feedback Applied

| Priority | Issue | Resolution |
|----------|-------|------------|
| P0 | Double-fetch/ownership check | Handler owns DB access; service is pure scorer |
| P0 | Missing scaling constants | Added SCORING_CONSTANTS object with all values |
| P1 | Regex pattern detection risk | Replaced with token-window scanning (O(n)) |
| P1 | Test layer mixing | Split into unit tests (injected assets) + asset sanity tests |
| P2 | Asset loading strategy | File-based + build copy (simpler than embedded TS) |
| P2 | Missing MAX_CHARS | Added MAX_CHARS=50000 guard |

### Additional Recommendations (Not Yet Applied)

1. **Structured logging**: Consider using existing structured logger if available
2. **Asset versioning**: Add content hash for future caching support
3. **Nonlinear rate→score mapping**: Consider soft-knee curve for very low/high rates (future enhancement)
4. **Sub-scores in response**: Consider internal logging of sub-scores for debugging (implemented in logs only)

### Effort Estimate

- Plan revisions: Complete (this document)
- Implementation: 9-13 hours
- Calibration runs (optional): +1-2 days if corpus testing desired

---

## Status (Final)
- 1. Collect context on existing text analysis/scoring code and integration points (completed)
- 2. Create feature branch for SLOP score work (completed)
- 3. Study slop-score repo algorithm details and data assets (completed)
- 4. Design integration approach and public API in this codebase (completed)
- 5. Finalize scoring spec + normalization + assets approach (completed)
- 6. Resolve implementation details before coding (completed)
- 7. Implement SLOP score calculation + data loading (completed)
- 8. Add tests or validation coverage for SLOP scoring (completed)
- 9. Run diagnostics/tests relevant to changes (completed)
- 10. Confirm integration scope (API endpoint vs review pipeline vs CLI) (completed)
