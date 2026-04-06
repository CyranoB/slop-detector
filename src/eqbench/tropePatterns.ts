// src/eqbench/tropePatterns.ts - AI writing trope patterns inspired by tropes.fyi

export type TropeCategory =
  | 'sentence_structure'
  | 'word_choice'
  | 'formatting'
  | 'tone'
  | 'composition';

interface TropeBase {
  trope_name: string;
  category: TropeCategory;
}

export interface PhrasePattern extends TropeBase { phrases: string[] }
export interface RegexPattern extends TropeBase { regex: RegExp }
export interface StatThreshold extends TropeBase { threshold: number }

// --- Helpers to reduce boilerplate ---

const CONTRACTION_MAP: Record<string, string> = {
  "it's": "it is",
  "here's": "here is",
  "let's": "let us",
};

function expandContractions(phrases: string[]): string[] {
  const expanded: string[] = [];
  for (const p of phrases) {
    expanded.push(p);
    for (const [contraction, full] of Object.entries(CONTRACTION_MAP)) {
      if (p.startsWith(contraction)) {
        expanded.push(full + p.slice(contraction.length));
        break;
      }
    }
  }
  return expanded;
}

function withPrefix(prefix: string, suffixes: string[]): string[] {
  return suffixes.map(s => `${prefix} ${s}`);
}

function trope(trope_name: string, category: TropeCategory): TropeBase {
  return { trope_name, category };
}

// ============================================================
// PHRASE-BASED TROPES
// ============================================================

export const PHRASE_PATTERNS: PhrasePattern[] = [
  {
    ...trope('filler_transitions', 'tone'),
    phrases: expandContractions([
      "it's worth noting", "it's important to note", "it bears mentioning",
      "it should be noted", "it's worth mentioning", "it's crucial to understand",
      "it's important to remember", "it's worth emphasizing",
    ]),
  },
  {
    ...trope('false_suspense', 'tone'),
    phrases: expandContractions([
      ...withPrefix("here's the", [
        "kicker", "thing", "catch", "twist", "secret", "deal", "lesson", "takeaway", "starting point",
      ]),
      "here's where it gets interesting", "here's what makes this", "here's what most people miss",
    ]),
  },
  {
    ...trope('serves_as_dodge', 'word_choice'),
    phrases: ["serves as", "stands as", "functions as", "acts as a", "operates as", "works as a"],
  },
  {
    ...trope('signposted_conclusion', 'composition'),
    phrases: [
      "in conclusion", "to sum up", "in summary", "to summarize", "all things considered",
      "in the final analysis", "at the end of the day", "when all is said and done",
      "to wrap up", "to conclude",
    ],
  },
  {
    ...trope('pedagogical_voice', 'tone'),
    phrases: expandContractions([
      "let's break this down", "let's unpack this", "let's dive in",
      "let's take a closer look", "let's explore", "let me walk you through",
      "let's dig into", "let's examine", "let me break this down", "let me explain",
    ]),
  },
  {
    ...trope('think_of_it_as', 'tone'),
    phrases: ["think of it as", "think of this as", "consider this", "picture this", "think of it like"],
  },
  {
    ...trope('imagine_a_world', 'tone'),
    phrases: ["imagine a world", "imagine a future", "picture a world", "imagine a scenario", "envision a world"],
  },
  {
    ...trope('truth_is_simple', 'tone'),
    phrases: expandContractions([
      "the truth is", "the reality is", "the fact is", "it's that simple",
      "the answer is simple", "the real story", "the simple truth",
      "the hard truth", "the uncomfortable truth",
    ]),
  },
  {
    ...trope('grandiose_stakes', 'tone'),
    phrases: [
      "fundamentally reshape", "fundamentally transform", "redefine what it means",
      "change everything", "reshape the way we", "transform the way",
      "revolutionize the way", "forever change", "reshape our understanding", "rewrite the rules",
    ],
  },
];

// ============================================================
// REGEX-BASED TROPES
// ============================================================

// Build alternation regex from word list to keep patterns readable
function words(list: string[]): string {
  return `(?:${list.join('|')})`;
}

const DETERMINERS = words(['The', 'This', 'That', 'Its', 'Her', 'His']);
const ARTICLES = words(['A', 'An', 'The']);
const PARTICIPLES = words([
  'Building', 'Looking', 'Turning', 'Moving', 'Diving',
  'Examining', 'Exploring', 'Considering', 'Reflecting',
]);
const PREPOSITIONS = words(['on', 'at', 'to', 'into', 'beyond', 'upon', 'in', 'back']);
const ATTRIBUTORS = words(['experts', 'researchers', 'analysts', 'critics', 'observers']);
const ATTR_VERBS = words(['say', 'believe', 'argue', 'suggest', 'warn', 'contend', 'predict']);

export const REGEX_PATTERNS: RegexPattern[] = [
  { ...trope('countdown_pattern', 'sentence_structure'),
    regex: /(?:^|[.!?]\s+)Not\s+[^.!?]{3,60}[.!?]\s*Not\s+[^.!?]{3,60}[.!?]\s*(?:Just|Simply|Only|But)\s+/gim },
  { ...trope('rhetorical_self_qa', 'sentence_structure'),
    regex: new RegExp(`(?:^|[.!?]\\s+)${DETERMINERS}\\s+\\w+\\?\\s+${ARTICLES}\\s+[^.!?]{3,60}[.!?]`, 'gim') },
  { ...trope('despite_challenges', 'composition'),
    regex: /\bdespite\s+(?:its|these?|th(?:is|ose|eir))\s+(?:challenges|limitations|shortcomings|flaws|issues|drawbacks|problems|weaknesses)/gi },
  { ...trope('participle_openings', 'sentence_structure'),
    regex: new RegExp(`(?:^|[.!?]\\s+)${PARTICIPLES}\\s+${PREPOSITIONS}\\b`, 'gim') },
  { ...trope('false_ranges', 'sentence_structure'),
    regex: /\bfrom\s+(?:[a-z]+\s+){1,4}to\s+(?:[a-z]+\s+){1,4}and\s+(?:everything|all)\s+in\s+between/gi },
  { ...trope('vague_attributions', 'tone'),
    regex: new RegExp(`\\b${ATTRIBUTORS}\\s+${ATTR_VERBS}\\b`, 'gi') },
];

// ============================================================
// STATISTICAL TROPES
// ============================================================

// Em-dash: human baseline ~1-3 per 1k chars; AI often 5+
export const EM_DASH_THRESHOLD: StatThreshold = { ...trope('em_dash_addiction', 'formatting'), threshold: 5.0 };

// Bold-first bullets in raw markdown (absolute count, even 2 is suspicious)
export const BOLD_FIRST_BULLET_REGEX = /^\s*[-*+]\s+\*\*[^*]+\*\*[:\s]/gm;
export const BOLD_FIRST_BULLET_THRESHOLD: StatThreshold = { ...trope('bold_first_bullets', 'formatting'), threshold: 2 };

// Unicode decoration characters
export const UNICODE_DECORATION_CHARS = /[\u2192\u2190\u2191\u2193\u2794\u27A1\u2714\u2716\u2717\u2718\u2713\u2022\u25CF\u25CB\u25AA\u25AB\u2605\u2606\u2728]/g;
export const UNICODE_DECORATION_THRESHOLD: StatThreshold = { ...trope('unicode_decoration', 'formatting'), threshold: 2.0 };

// Anaphora: 3+ consecutive sentences starting with the same word
export const ANAPHORA_MIN_RUN = 3;

// Short punchy fragments: sentences under 6 words
export const SHORT_FRAGMENT_WORD_LIMIT = 6;
export const SHORT_FRAGMENT_DENSITY_THRESHOLD = 0.25;

// Tricolon abuse: "X, Y, and Z" patterns
export const TRICOLON_REGEX = /\b\w+(?:\s+\w+){0,2},\s+\w+(?:\s+\w+){0,2},\s+and\s+\w+/gi;
export const TRICOLON_DENSITY_THRESHOLD: StatThreshold = { ...trope('tricolon_abuse', 'sentence_structure'), threshold: 6.0 };
