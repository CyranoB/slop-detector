// src/eqbench/tropePatterns.ts - AI writing trope patterns inspired by tropes.fyi

export type TropeCategory =
  | 'sentence_structure'
  | 'word_choice'
  | 'formatting'
  | 'tone'
  | 'composition';

export interface PhrasePattern {
  trope_name: string;
  category: TropeCategory;
  phrases: string[];
}

export interface RegexPattern {
  trope_name: string;
  category: TropeCategory;
  regex: RegExp;
}

export interface StatThreshold {
  trope_name: string;
  category: TropeCategory;
  threshold: number;
}

// Auto-expand contractions so we only write "it's X" and get "it is X" for free
const CONTRACTION_MAP: Record<string, string> = {
  "it's": "it is",
  "here's": "here is",
  "let's": "let us",
};

function expandContractions(phrases: string[]): string[] {
  const expanded: string[] = [];
  for (const phrase of phrases) {
    expanded.push(phrase);
    for (const [contraction, full] of Object.entries(CONTRACTION_MAP)) {
      if (phrase.startsWith(contraction)) {
        expanded.push(full + phrase.slice(contraction.length));
        break;
      }
    }
  }
  return expanded;
}

function phrase(trope_name: string, category: TropeCategory, phrases: string[]): PhrasePattern {
  return { trope_name, category, phrases: expandContractions(phrases) };
}

// ============================================================
// PHRASE-BASED TROPES
// Detected by case-insensitive substring matching in text
// ============================================================

export const PHRASE_PATTERNS: PhrasePattern[] = [
  phrase('filler_transitions', 'tone', [
    "it's worth noting",
    "it's important to note",
    "it bears mentioning",
    "it should be noted",
    "it's worth mentioning",
    "it's crucial to understand",
    "it's important to remember",
    "it's worth emphasizing",
  ]),
  phrase('false_suspense', 'tone', [
    "here's the kicker",
    "here's the thing",
    "here's the catch",
    "here's where it gets interesting",
    "here's what makes this",
    "here's the twist",
    "here's what most people miss",
    "here's the secret",
    "here's the deal",
    "here's the lesson",
    "here's the takeaway",
    "here's the starting point",
  ]),
  phrase('serves_as_dodge', 'word_choice', [
    "serves as",
    "stands as",
    "functions as",
    "acts as a",
    "operates as",
    "works as a",
  ]),
  phrase('signposted_conclusion', 'composition', [
    "in conclusion",
    "to sum up",
    "in summary",
    "to summarize",
    "all things considered",
    "in the final analysis",
    "at the end of the day",
    "when all is said and done",
    "to wrap up",
    "to conclude",
  ]),
  phrase('pedagogical_voice', 'tone', [
    "let's break this down",
    "let's unpack this",
    "let's dive in",
    "let's take a closer look",
    "let's explore",
    "let me walk you through",
    "let's dig into",
    "let's examine",
    "let me break this down",
    "let me explain",
  ]),
  phrase('think_of_it_as', 'tone', [
    "think of it as",
    "think of this as",
    "consider this",
    "picture this",
    "think of it like",
  ]),
  phrase('imagine_a_world', 'tone', [
    "imagine a world",
    "imagine a future",
    "picture a world",
    "imagine a scenario",
    "envision a world",
  ]),
  phrase('truth_is_simple', 'tone', [
    "the truth is",
    "the reality is",
    "the fact is",
    "it's that simple",
    "the answer is simple",
    "the real story",
    "the simple truth",
    "the hard truth",
    "the uncomfortable truth",
  ]),
  phrase('grandiose_stakes', 'tone', [
    "fundamentally reshape",
    "fundamentally transform",
    "redefine what it means",
    "change everything",
    "reshape the way we",
    "transform the way",
    "revolutionize the way",
    "forever change",
    "reshape our understanding",
    "rewrite the rules",
  ]),
];

// ============================================================
// REGEX-BASED TROPES
// Detected by regex matching against normalized text
// ============================================================

export const REGEX_PATTERNS: RegexPattern[] = [
  // "Not X. Not Y. Just Z." countdown pattern
  {
    trope_name: 'countdown_pattern',
    category: 'sentence_structure',
    regex: /(?:^|[.!?]\s+)Not\s+[^.!?]{3,60}[.!?]\s*Not\s+[^.!?]{3,60}[.!?]\s*(?:Just|Simply|Only|But)\s+/gim,
  },
  // "The X? A Y." rhetorical self-Q&A
  {
    trope_name: 'rhetorical_self_qa',
    category: 'sentence_structure',
    regex: /(?:^|[.!?]\s+)(?:The|This|That|Their|Its|His|Her)\s+\w+(?:\s+\w+)?\?\s+(?:A|An|The|It's|It\s+is)\s+[^.!?]{3,60}[.!?]/gim,
  },
  // "Despite its challenges..." acknowledge-and-dismiss
  {
    trope_name: 'despite_challenges',
    category: 'composition',
    regex: /\b(?:despite\s+(?:its|these|the|this|those|their)\s+(?:challenges|limitations|shortcomings|flaws|issues|drawbacks|imperfections|problems|weaknesses|concerns))/gi,
  },
  // Participle phrase openings - "Building on", "Looking at", "Turning to"
  {
    trope_name: 'participle_openings',
    category: 'sentence_structure',
    regex: /(?:^|[.!?]\s+)(?:Building|Looking|Turning|Moving|Shifting|Diving|Examining|Exploring|Considering|Reflecting|Digging|Stepping|Zooming|Pulling|Peeling|Circling)\s+(?:on|at|to|into|beyond|upon|in|back|deeper|further)\b/gim,
  },
  // False ranges - "From X to Y" where X/Y are qualitative
  {
    trope_name: 'false_ranges',
    category: 'sentence_structure',
    regex: /\bfrom\s+(?:[a-z]+\s+){1,4}to\s+(?:[a-z]+\s+){1,4}(?:and\s+(?:everything|everyone|anything|all)\s+(?:in\s+between|else))/gi,
  },
  // Vague attributions - "Experts say" without citation
  {
    trope_name: 'vague_attributions',
    category: 'tone',
    regex: /\b(?:experts|researchers|scientists|analysts|critics|observers|insiders|commentators|industry\s+leaders)\s+(?:say|believe|argue|suggest|note|point\s+out|contend|warn|agree|predict|estimate|report)\b/gi,
  },
];

// ============================================================
// STATISTICAL TROPES (applied to raw/pre-normalized text)
// Detected by counting occurrences and comparing against thresholds
// ============================================================

function stat(trope_name: string, category: TropeCategory, threshold: number): StatThreshold {
  return { trope_name, category, threshold };
}

// Em-dash: human baseline ~1-3 per 1k chars; AI often 5+ (rate per 1k chars)
export const EM_DASH_THRESHOLD = stat('em_dash_addiction', 'formatting', 5.0);

// Bold-first bullets: regex applied to raw markdown (absolute count, even 2 is suspicious)
export const BOLD_FIRST_BULLET_REGEX = /^\s*[-*+]\s+\*\*[^*]+\*\*[:\s]/gm;
export const BOLD_FIRST_BULLET_THRESHOLD = stat('bold_first_bullets', 'formatting', 2);

// Unicode decoration characters (rate per 1k chars)
export const UNICODE_DECORATION_CHARS = /[\u2192\u2190\u2191\u2193\u2794\u27A1\u2714\u2716\u2717\u2718\u2713\u2022\u25CF\u25CB\u25AA\u25AB\u2605\u2606\u2728]/g;
export const UNICODE_DECORATION_THRESHOLD = stat('unicode_decoration', 'formatting', 2.0);

// Anaphora: 3+ consecutive sentences starting with the same word
export const ANAPHORA_MIN_RUN = 3;

// Short punchy fragments: sentences under 6 words
export const SHORT_FRAGMENT_WORD_LIMIT = 6;
export const SHORT_FRAGMENT_DENSITY_THRESHOLD = 0.25; // 25% of sentences

// Tricolon abuse: "X, Y, and Z" patterns (rate per 1k chars)
export const TRICOLON_REGEX = /\b\w+(?:\s+\w+){0,3},\s+\w+(?:\s+\w+){0,3},\s+and\s+\w+(?:\s+\w+){0,3}\b/gi;
export const TRICOLON_DENSITY_THRESHOLD = stat('tricolon_abuse', 'sentence_structure', 6.0);
