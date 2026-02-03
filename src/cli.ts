#!/usr/bin/env node
// CLI entry point for SLOP Score detector

import { computeEqBenchScore } from './eqbench/scorer.js';
import { stripHtml, stripMarkdown } from './textNormalizer.js';
import * as fs from 'fs/promises';

async function main() {
  const args = process.argv.slice(2);

  // Handle help flag
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  // Check for input
  if (args.length === 0) {
    console.error('Error: No input provided\n');
    printHelp();
    process.exit(1);
  }

  let rawText: string;

  try {
    if (args[0] === '-') {
      // Read from stdin
      rawText = await readStdin();
    } else {
      // Read from file
      const filePath = args[0];
      rawText = await fs.readFile(filePath, 'utf-8');
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
    console.log('\n=== SLOP Score Analysis ===\n');
    console.log(`Final Score: ${result.slopScore}/100`);
    console.log(`Word Count: ${result.wordCount}`);
    console.log(`Character Count: ${result.charCount}`);
    console.log('\nComponent Metrics:');
    console.log(`  Word Score: ${result.metrics.slop_list_matches_per_1k_words.toFixed(2)} per 1k words`);
    console.log(`  Trigram Score: ${result.metrics.slop_trigram_matches_per_1k_words.toFixed(2)} per 1k words`);
    console.log(`  Contrast Pattern Score: ${result.metrics.not_x_but_y_per_1k_chars.toFixed(2)} per 1k chars`);

    if (result.details.wordHits.length > 0) {
      console.log('\nTop Slop Words:');
      result.details.wordHits.slice(0, 10).forEach(([word, count]) => {
        console.log(`  "${word}": ${count}×`);
      });
    }

    if (result.details.trigramHits.length > 0) {
      console.log('\nTop Slop Trigrams:');
      result.details.trigramHits.slice(0, 5).forEach(([trigram, count]) => {
        console.log(`  "${trigram}": ${count}×`);
      });
    }

    if (result.details.contrastMatches.length > 0) {
      console.log('\nContrast Patterns Found:');
      result.details.contrastMatches.slice(0, 5).forEach((match) => {
        console.log(`  Pattern: ${match.pattern_name}`);
        console.log(`  Match: "${match.match_text}"`);
        if (match.sentence && match.sentence.length < 150) {
          console.log(`  Sentence: "${match.sentence}"`);
        }
        console.log();
      });
    }

    console.log('---\n');

    // Interpretation
    if (result.slopScore < 20) {
      console.log('Interpretation: Very human-like, natural writing');
    } else if (result.slopScore < 40) {
      console.log('Interpretation: Mostly human with some AI characteristics');
    } else if (result.slopScore < 60) {
      console.log('Interpretation: Mixed characteristics, unclear origin');
    } else if (result.slopScore < 80) {
      console.log('Interpretation: Likely AI-generated with some editing');
    } else {
      console.log('Interpretation: Strong AI signature, minimal human intervention');
    }
    console.log();

  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('Unknown error occurred');
    }
    process.exit(1);
  }
}

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

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
