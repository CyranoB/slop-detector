# SLOP Score Detector

AI-generated text detection tool using the EQBench SLOP score algorithm.

## What is SLOP Score?

SLOP (Shitty LLM Output Patterns) is a 0-100 metric that measures how "AI-like" text appears:

- **0-20**: Very human-like, natural writing
- **20-40**: Mostly human with some AI characteristics
- **40-60**: Mixed characteristics, unclear origin
- **60-80**: Likely AI-generated with some editing
- **80-100**: Strong AI signature, minimal human intervention

## How It Works

The algorithm combines three components with weighted scoring:

```
Final Score = (Word Score × 60%) + (Contrast Patterns × 25%) + (Trigram Score × 15%)
```

1. **Word Score (60%)**: Detects overuse of "slop words" like *delve*, *tapestry*, *paradigm*, *leverage*
2. **Contrast Patterns (25%)**: Finds "not X but Y" structures using regex + POS tagging
3. **Trigram Score (15%)**: Catches common 3-word phrases like "it is important", "to note that"

## Installation

```bash
npm install
npm run build
```

## Usage

### Command Line

```bash
# Score a file
npm run score article.txt

# Or use the built binary directly
node dist/cli.js article.txt

# Score from stdin
cat blog-post.md | node dist/cli.js -
echo "Let's delve into this topic" | node dist/cli.js -

# Show help
node dist/cli.js --help
```

### As a Library

```typescript
import { computeEqBenchScore } from 'slop-detector';
import { stripHtml, stripMarkdown } from 'slop-detector';

const text = "Your text here...";
const plainText = stripMarkdown(stripHtml(text));
const result = await computeEqBenchScore(plainText);

console.log(`SLOP Score: ${result.slopScore}/100`);
console.log(`Word Count: ${result.wordCount}`);
console.log(`Metrics:`, result.metrics);
```

## Example Output

```
=== SLOP Score Analysis ===

Final Score: 67.3/100
Word Count: 342
Character Count: 2156

Component Metrics:
  Word Score: 18.42 per 1k words
  Trigram Score: 5.26 per 1k words
  Contrast Pattern Score: 1.39 per 1k chars

Top Slop Words:
  "delve": 3×
  "tapestry": 2×
  "leverage": 2×

Top Slop Trigrams:
  "it is important": 2×
  "to note that": 1×

Contrast Patterns Found:
  Pattern: S1_not_just_but
  Match: "not just a product but"
  Sentence: "This is not just a product but a comprehensive solution."

---

Interpretation: Likely AI-generated with some editing
```

## Testing

Try the provided example files:

```bash
npm run score examples/low-slop.txt      # Human-like writing
npm run score examples/high-slop.txt     # AI-like writing
npm run score examples/pattern-heavy.txt # Pattern-heavy text
```

Run the test suite:

```bash
npm test
```

## Customization

### Adjust Scoring Weights

Edit `src/eqbench/scorer.ts`:

```typescript
const SCORING_CONSTANTS = {
  WEIGHT_WORD: 0.60,      // Increase to make word matching more important
  WEIGHT_PATTERN: 0.25,   // Increase if patterns are strong indicators
  WEIGHT_TRIGRAM: 0.15,   // Adjust based on your use case
  WORD_MULTIPLIER: 1000,
  TRIGRAM_MULTIPLIER: 1000,
};
```

### Add Custom Slop Words

Edit `src/assets/slop_list.json`:

```json
[
  ["delve"],
  ["tapestry"],
  ["your-custom-word"]
]
```

### Add Custom Patterns

Edit `src/eqbench/regexesStage1.ts`:

```typescript
export const STAGE1_REGEXES = {
  not_just_but: /\bnot\s+just\b[^.!?]{1,50}\bbut\b/gi,
  your_pattern: /your\s+regex\s+here/gi,
};
```

## Algorithm Details

For detailed information about the EQBench algorithm, normalization process, and implementation details, see:

- **[docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md)** - Complete technical documentation

## Performance

- **Time Complexity**: O(n) where n = text length
- **Memory Usage**: ~200KB for assets + ~5-10KB per 1000 words
- **Processing Speed**:
  - 500 words: ~50-100ms
  - 2000 words: ~150-250ms
  - 5000 words: ~300-500ms

## Requirements

- Node.js 18.0.0 or higher
- TypeScript 5.0.0 or higher

## License

MIT

## Credits

This project implements and adapts the public SLOP score approach and materials:
- slop-score repository (Samuel J. Paech): https://github.com/sam-paech/slop-score
- EQBench SLOP Score overview: https://eqbench.com/slop-score.html

BibTeX:
```bibtex
@misc{paech2025slopScore,
      title={slop-score},
      author={Samuel J. Paech},
      year={2025},
      howpublished={\url{https://github.com/sam-paech/slop-score}},
      note={GitHub repository}
}
```
