# How SLOP Detector Works

This document explains the algorithm and project structure in plain terms. The method is tuned for creative writing and storytelling, not for strict AI detection across all domains. It currently supports English text only.

## The Core Idea

Large Language Models (LLMs) have writing quirks. They overuse certain words, phrases, and rhetorical patterns. SLOP Detector counts these patterns and produces a 0-100 score that is most meaningful for creative prose:

- **Low score (0-30)**: Looks human-written
- **High score (30+)**: Looks AI-generated

> A score above 30 is suspicious. Most human writing scores below 20.

## What We Detect

### 1. Slop Words (60% of final score)

LLMs love certain words that humans rarely use in casual writing:

| Word | Why it's suspicious |
|------|---------------------|
| delve | Overused by ChatGPT, rarely used by humans |
| tapestry | Pretentious metaphor LLMs love |
| paradigm | Corporate buzzword LLMs overuse |
| leverage | Business jargon LLMs default to |
| vibrant | Generic positive adjective |
| synergy | Classic AI corporate-speak |
| nuanced | LLMs use this to sound thoughtful |
| multifaceted | Another "I'm being thorough" word |

We maintain a list of ~500 such words in `src/assets/slop_list.json`.

**How we score it:**
```
word_score = (slop_words_found / total_words) × 1000
```

Example: 10 slop words in 500 words = 2% = score of 20

### 2. Contrast Patterns (25% of final score)

LLMs love the "not X, but Y" rhetorical structure:

> "This is **not just** a product, **but** a revolution."
> "It's **not merely** useful—**it's** essential."
> "We're **not simply** improving; **we're** reimagining."

Humans occasionally use this pattern. LLMs use it constantly.

We detect these patterns using:
1. **Simple regex** for surface patterns (fast, catches obvious cases)
2. **Part-of-speech tagging** for complex patterns (slower, catches subtle cases)

The POS tagger (`wink-pos-tagger`) helps us understand sentence structure:
- "not just [VERB]ing but [VERB]ing" 
- "not a [NOUN] but a [NOUN]"

### 3. Slop Trigrams (15% of final score)

Three-word phrases that LLMs overuse:

| Trigram | Context |
|---------|---------|
| "it is important" | LLMs love stating importance |
| "to note that" | Filler phrase |
| "in order to" | Verbose alternative to "to" |
| "a testament to" | Cliché LLMs overuse |
| "serves as a" | Weak verb construction |

We check every 3-word window in the text against ~1000 known trigrams.

## The Scoring Formula

```
Final Score = (Word Score × 0.60) + (Pattern Score × 0.25) + (Trigram Score × 0.15)
```

Each component is normalized to 0-100, then weighted and combined.

### Normalization

Raw counts don't mean much. "50 slop words" could be terrible (in 200 words) or fine (in 5000 words).

We normalize by:
1. Converting counts to **rates** (per 1000 words/chars)
2. Comparing against a **benchmark** of known LLM outputs

The benchmark comes from `src/assets/leaderboard_results.json`, which contains SLOP metrics from various LLMs tested on creative writing tasks.

## Project Structure

```
src/
├── cli.ts                    # Command-line interface
├── mcpServer.ts              # MCP server (for AI assistants)
├── index.ts                  # Public API exports
├── slopScoreService.ts       # Main scoring orchestration
├── textNormalizer.ts         # Strip HTML/Markdown
├── types.ts                  # TypeScript interfaces
│
├── mcp/
│   └── scoreTextTool.ts      # MCP tool handler
│
├── eqbench/                  # Core algorithm (from EQBench)
│   ├── scorer.ts             # Main scoring logic
│   ├── tokenizer.ts          # Text tokenization
│   ├── contrastDetector.ts   # Pattern detection orchestration
│   ├── contrastDetectorHelpers.ts  # POS-based pattern matching
│   ├── regexesStage1.ts      # Surface-level regex patterns
│   └── regexesStage2.ts      # Complex regex patterns
│
└── assets/                   # Data files
    ├── slop_list.json        # Slop words (~500 entries)
    ├── slop_list_trigrams.json   # Slop trigrams (~1000 entries)
    └── leaderboard_results.json  # Benchmark data for normalization
```

## The Pipeline

When you call `score_text("some text")`:

```
1. NORMALIZE
   └─> Strip HTML tags (if present)
   └─> Strip Markdown formatting (if present)
   └─> Result: plain text

2. TOKENIZE
   └─> Split into words
   └─> Lowercase everything
   └─> Remove punctuation-only tokens
   └─> Result: ["this", "is", "a", "test"]

3. COUNT SLOP WORDS
   └─> For each token, check if it's in slop_list
   └─> Count matches
   └─> Result: { "delve": 3, "tapestry": 2 }

4. COUNT TRIGRAMS
   └─> Slide a 3-word window across tokens
   └─> Check each trigram against slop_list_trigrams
   └─> Result: { "it is important": 2 }

5. DETECT CONTRAST PATTERNS
   └─> Run regex patterns (Stage 1)
   └─> Run POS-based patterns (Stage 2)
   └─> Result: [{ pattern: "not_just_but", match: "not just X but Y" }]

6. NORMALIZE SCORES
   └─> Convert to per-1k rates
   └─> Compare against benchmark ranges
   └─> Scale to 0-100

7. COMBINE
   └─> word_score × 0.60 + pattern_score × 0.25 + trigram_score × 0.15
   └─> Result: 42.5
```

## Adding New Detection

### Add a slop word

Edit `src/assets/slop_list.json`:
```json
[
  ["delve"],
  ["tapestry"],
  ["your-new-word"]
]
```

### Add a trigram

Edit `src/assets/slop_list_trigrams.json`:
```json
[
  ["it is important"],
  ["your new trigram"]
]
```

### Add a contrast pattern

Edit `src/eqbench/regexesStage1.ts`:
```typescript
export const STAGE1_REGEXES: Record<string, RegExp> = {
  // ... existing patterns ...
  your_pattern: /your\s+regex\s+here/gi,
};
```

For complex patterns requiring POS tagging, edit `regexesStage2.ts`.

## Performance

The algorithm is O(n) where n = text length:
- Word matching: O(n) with Set lookup
- Trigram matching: O(n) sliding window
- Pattern matching: O(n) regex scan

Typical processing times:
- 500 words: ~50ms
- 2000 words: ~150ms  
- 5000 words: ~300ms

## Credits

This implementation is based on:
- [slop-score](https://github.com/sam-paech/slop-score) by Samuel J. Paech
- [EQBench SLOP Score](https://eqbench.com/slop-score.html) methodology

The core insight—that LLMs have detectable writing patterns—comes from empirical analysis of thousands of LLM outputs across different models and prompts.
