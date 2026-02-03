# SLOP Score Detector

![SLOP Score Detector](assets/header.png)

Detect AI-generated text by analyzing writing patterns. Returns a 0-100 score where higher = more AI-like.

## Quick Start

```bash
npx -y slop-detector
```

This starts an MCP server. Add it to your AI assistant:

**Claude Code:**
```bash
claude mcp add slop-detector -- npx -y slop-detector
```

**Codex:**
```bash
codex mcp add slop-detector -- npx -y slop-detector
```

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "slop-detector": {
      "command": "npx",
      "args": ["-y", "slop-detector"]
    }
  }
}
```

## What It Detects

| Component | Weight | What it finds |
|-----------|--------|---------------|
| **Slop Words** | 60% | Overused words like *delve*, *tapestry*, *paradigm*, *leverage* |
| **Contrast Patterns** | 25% | "Not X but Y" structures that LLMs love |
| **Trigrams** | 15% | Common 3-word phrases like "it is important" |

## Score Interpretation

| Score | Meaning |
|-------|---------|
| 0-20 | Human-like writing |
| 20-40 | Mostly human, some AI patterns |
| 40-60 | Mixed, unclear origin |
| 60-80 | Likely AI-generated |
| 80-100 | Strong AI signature |

> **Rule of thumb:** Scores above 30 are suspicious.

## Usage

### As an MCP Tool

The `score_text` tool accepts text and returns:
- `slopScore`: 0-100 score
- `wordCount`, `charCount`: Text statistics  
- `metrics`: Detailed breakdown (words/trigrams/patterns per 1k)

### Command Line

```bash
# Install and build
npm install && npm run build

# Score a file
node dist/cli.js article.txt

# Score from stdin
echo "Let's delve into this tapestry of ideas" | node dist/cli.js -
pbpaste | node dist/cli.js -   # macOS clipboard
```

### As a Library

```typescript
import { slopScoreService } from 'slop-detector';

const result = await slopScoreService.computeScoreFromText(text, 'en');
console.log(result.slopScore); // 42.5
```

## Example Output

```
=== SLOP Score Analysis ===

Final Score: 67.3/100
Word Count: 342

Top Slop Words:
  "delve": 3×
  "tapestry": 2×

Contrast Patterns Found:
  "not just a product but a comprehensive solution"

Interpretation: Likely AI-generated with some editing
```

## How It Works

See **[docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md)** for:
- Detailed algorithm explanation
- Project structure
- How to add custom patterns

## Development

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm test             # Run tests
npm run mcp          # Start MCP server locally
```

## Requirements

- Node.js 18+

## License

MIT

## Credits

Based on [slop-score](https://github.com/sam-paech/slop-score) by Samuel J. Paech and the [EQBench](https://eqbench.com/slop-score.html) methodology.
