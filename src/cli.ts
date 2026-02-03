#!/usr/bin/env node
// CLI entry point for SLOP Score detector

import { computeEqBenchScore } from './eqbench/scorer.js';
import { stripHtml, stripMarkdown } from './textNormalizer.js';
import { getCliInput, renderScoreOutput } from './cliHelpers.js';
import * as fs from 'node:fs/promises';

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

function printHelp() {
  console.log(`
SLOP Score Detector - AI-generated text detection tool

Usage:
  slop-score <file-path>     Score a text file
  slop-score -               Read from stdin
  slop-score --help          Show this help message

Examples:
  slop-score article.txt
  slop-score blog-post.md
  cat document.html | slop-score -
  echo "Let's delve into this topic" | slop-score -

Score Interpretation:
  0-20:   Very human-like, natural writing
  20-40:  Mostly human with some AI characteristics
  40-60:  Mixed characteristics, unclear origin
  60-80:  Likely AI-generated with some editing
  80-100: Strong AI signature, minimal human intervention

The algorithm analyzes three components:
  - Word Score (60%): Overused AI vocabulary
  - Contrast Patterns (25%): "not X but Y" structures
  - Trigram Score (15%): Common AI 3-word phrases
`);
}

const args = process.argv.slice(2);
const input = getCliInput(args);

// Handle help flag
if (input.mode === 'help') {
  printHelp();
  process.exit(0);
}

// Check for input
if (input.mode === 'missing') {
  console.error('Error: No input provided\n');
  printHelp();
  process.exit(1);
}

try {
  let rawText: string;

  if (input.mode === 'stdin') {
    // Read from stdin
    rawText = await readStdin();
  } else {
    // Read from file
    rawText = await fs.readFile(input.filePath, 'utf-8');
  }

  if (!rawText || rawText.trim().length === 0) {
    console.error('Error: Input is empty');
    process.exit(1);
  }

  // Process text: strip HTML/Markdown
  const plainText = stripMarkdown(stripHtml(rawText));

  // Compute SLOP score
  const result = await computeEqBenchScore(plainText);

  // Output results
  console.log(renderScoreOutput(result));

} catch (error) {
  if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
  } else {
    console.error('Unknown error occurred');
  }
  process.exit(1);
}
