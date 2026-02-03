# Quick Start Guide

Get up and running with SLOP Score Detector in 60 seconds.

## 1. Install Dependencies

```bash
npm install
```

## 2. Build the Project

```bash
npm run build
```

## 3. Try the Examples

```bash
# Test with human-like writing (expect low score)
node dist/cli.js examples/low-slop.txt

# Test with AI-like writing (expect high score)
node dist/cli.js examples/high-slop.txt

# Test with pattern-heavy text (expect medium score)
node dist/cli.js examples/pattern-heavy.txt
```

## 4. Score Your Own Text

```bash
# Score a file
node dist/cli.js your-article.txt

# Score from clipboard (macOS)
pbpaste | node dist/cli.js -

# Score from clipboard (Linux)
xclip -o | node dist/cli.js -

# Quick test
echo "Let's delve into this vibrant tapestry" | node dist/cli.js -
```

## 5. Understanding the Output

```
Final Score: 67.3/100
```

- **0-20**: Human writing
- **20-40**: Mostly human
- **40-60**: Unclear
- **60-80**: Likely AI
- **80-100**: Strong AI signature

## What's Next?

- Read **[README.md](README.md)** for detailed usage
- See **[docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md)** for algorithm details
- Customize scoring weights in `src/eqbench/scorer.ts`
- Add your own slop words to `src/assets/slop_list.json`

## Common Issues

**Build fails**: Make sure you have Node.js 18+ and TypeScript 5+

**Assets not found**: Run `npm run build` again to copy assets to dist/

**TypeScript errors**: Install dependencies with `npm install`

## Need Help?

See the full documentation in [README.md](README.md) or check the [implementation details](docs/IMPLEMENTATION.md).
