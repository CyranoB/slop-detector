import { htmlToText } from 'html-to-text';
import type { NormalizedText } from './types.js';

export function stripHtml(html: string): string {
  return htmlToText(html, {
    wordwrap: false,
    preserveNewlines: false,
    selectors: [
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'img', format: 'skip' },
    ],
  });
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // SECURITY: Use non-greedy match with explicit character class to avoid ReDoS
    // This matches code blocks: ```...``` across multiple lines
    .replace(/```[^`]*```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '');
}

export function tokenize(text: string): string[] {
  const normalized = text.normalize('NFKC').toLowerCase();
  
  return normalized
    .split(/\s+/)
    .map(token => token.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(token => token.length > 0);
}

export function normalizeText(rawContent: string): NormalizedText {
  // SECURITY: Use bounded regex to detect HTML tags, avoiding ReDoS with [\s\S]*
  // Matches simple opening tags like <div, <p, <span - sufficient for detection
  const isHtml = /<[a-z][a-z0-9]*[\s>]/i.test(rawContent);
  
  let processed = rawContent;
  if (isHtml) {
    processed = stripHtml(processed);
  }
  
  processed = stripMarkdown(processed);
  
  processed = processed.replace(/\s+/g, ' ').trim();
  
  const tokens = tokenize(processed);
  
  return {
    text: processed,
    charCount: processed.length,
    wordCount: tokens.length,
    tokens,
  };
}
