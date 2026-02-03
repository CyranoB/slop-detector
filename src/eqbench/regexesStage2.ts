// src/services/slopScore/eqbench/regexesStage2.ts

// Quote character class - matches ", ', " (smart quotes removed to avoid duplicates)
// Using \x22 for " and \x27 for ' to avoid escaping issues
const Q = '["\']';  // Simple quote class
const NQ = '[^"\']'; // Negated quote class

// Common patterns extracted to reduce complexity
const SUBJ_IT_THEY = '(?:it|they)';
const SUBJ_IT_THEY_CAP = '(?:[Ii]t|[Tt]hey)';
const VERB_BE_PAST = '(?:was|were)';
const VERB_BE_PRES = '(?:is|are)';
const VERB_BE_ALL = '(?:was|were|is|are)';
const VERB_BE_CONTR = "(?:'s|'re)";
const NEG_CONTR = "(?:wasn't|weren't|isn't|aren't)";
const NEG_CONTR_EXT = "(?:wasn't|weren't|isn't|aren't|don't|doesn't)";
const EMPH_MARK = '[*_~]?';

// 1. "doesn't VERB. It VERB"
export const RE_POS_DOESNT_VERB = new RegExp(`${Q}\\s*(?:[Tt]he\\s+\\w+|[Ii]t|[Tt]hey|[Yy]ou)\\s+doesn't\\s+VERB[^.!?]*?[.!?]\\s*(?:it|they|you|that)\\s+${EMPH_MARK}(?:VERB|whispers?|reminds?|signals?|tests?|speaks?)`, 'gi');

// 2. "don't just VERB. They VERB"
export const RE_POS_DONT_JUST_VERB = new RegExp(`${Q}\\s*(?:[Tt]hey|[Yy]ou|[Ii]t)\\s+don't\\s+just\\s+VERB[^.!?]*?[—-]\\s*they\\s+${EMPH_MARK}VERB`, 'gi');

// 3. "not just VERBing. VERBing"
export const RE_POS_GERUND_FRAGMENT = new RegExp(`${Q}\\s*Not\\s+just\\s+VERB[.!?]\\s+${EMPH_MARK}VERB[.!?]`, 'g');

// 4. "not ADJ. They were ADJ" - simplified with extracted constants
const ADJ_LIST_NEG = '(?:random|passive|simple|normal)';
const ADJ_LIST_POS = '(?:intentional|active|complex|different|\\w{8,})';
export const RE_POS_NOT_ADJ = new RegExp(`\\bnot\\s+${ADJ_LIST_NEG}[.!?;]\\s+${SUBJ_IT_THEY_CAP}\\s+(?:${VERB_BE_PAST}|${VERB_BE_PRES}|${VERB_BE_CONTR})\\s+${EMPH_MARK}${ADJ_LIST_POS}`, 'gi');

// 5. Broader dash pattern with VERB - simplified
export const RE_POS_DASH_VERB = new RegExp(`\\b${NEG_CONTR}\\s+just\\s+(?:VERB|a\\s+\\w+)[^-]{0,30}?-\\s*${SUBJ_IT_THEY}\\s+(?:${VERB_BE_ALL}|${VERB_BE_CONTR})\\s+${EMPH_MARK}(?:VERB|a\\s+${EMPH_MARK}\\w+)`, 'gi');

// 6. "not just VERB. It was VERB" - simplified
export const RE_POS_NOT_JUST_VERB_PAST = new RegExp(`\\b${VERB_BE_PAST}\\s+not\\s+just\\s+(?:VERB|a\\s+\\w+)[.!?]\\s+${SUBJ_IT_THEY_CAP}\\s+${VERB_BE_PAST}\\s+${EMPH_MARK}(?:VERB|a\\s+${EMPH_MARK}\\w+)`, 'gi');

// 7. Colon separator pattern - simplified
export const RE_POS_COLON_VERB = new RegExp(`:\\s+(?:the\\s+\\w+|it|they)\\s+${VERB_BE_PAST}\\s+not\\s+just\\s+VERB[.!?]\\s+${SUBJ_IT_THEY_CAP}\\s+${VERB_BE_PAST}\\s+${EMPH_MARK}VERB`, 'gi');

// 8. Same verb lemma - matches specific verb lemmas appearing twice
const VERB_LEMMAS = '(?:REACT|SPEAK|LISTEN|LEARN|SIGNAL|WARN|DIE|LIVE|TEST|TEACH|AMPLIFY|INTERPRET|TRANSLATE|DECODE|EMIT)';
export const RE_LEMMA_SAME_VERB = new RegExp(`\\b(${VERB_LEMMAS})\\b[^.!?]{5,80}?[.!?;—-]\\s*[^.!?]{0,40}?\\b\\1\\b`, 'gi');

// 9. "isn't just VERB" within quotes
export const RE_POS_ISNT_JUST_VERB = new RegExp(`${Q}\\s*(?:${NQ}{0,100}?\\b)?(?:The\\s+\\w+|It|They|You)\\s+(?:isn't|aren't|wasn't|weren't)\\s+just\\s+VERB${NQ}{0,40}?[—-]\\s*(?:it's|they're)\\s+${EMPH_MARK}VERB`, 'gi');

// 10. Complex multi-sentence in quotes with VERB
export const RE_POS_QUOTE_MULTI_VERB = new RegExp(`${Q}\\s*${NQ}{0,150}?\\b(?:not\\s+just|isn't|aren't)\\s+(?:VERB|a\\s+\\w+)${NQ}{0,60}?[.!?]\\s+(?:${NQ}{0,40}?\\b)?(?:It's|They're|You're|That's)\\s+${EMPH_MARK}(?:VERB|a\\s+${EMPH_MARK}\\w+)`, 'gi');

// 11. Ellipsis with VERB
export const RE_POS_ELLIPSIS_VERB = new RegExp(`${Q}\\s*${NQ}{0,100}?\\b(?:not\\s+just|isn't)\\s+VERB${NQ}{0,30}?[.…]\\s*[.…]\\s*(?:they're|it's|you're)\\s+${EMPH_MARK}VERB`, 'gi');

// 12. "not NOUN. It's/That's a NOUN"
export const RE_POS_NOT_NOUN = new RegExp(`${Q}\\s*(?:That's|It's)\\s+not\\s+(?:a\\s+)?(?:sign|message|warning|pattern|test|phenomenon|one\\s+\\w+)[.!?]\\s+(?:That's|It's)\\s+(?:a\\s+|\\*?all\\s+)?${EMPH_MARK}(?:warning|question|language|symbol|test|presence|story|challenge|\\w+)`, 'gi');

// 13. "doesn't VERB. It *VERB" with emphasis
export const RE_POS_DOESNT_VERB_EMPHASIS = new RegExp(`${Q}\\s*(?:The\\s+\\w+|It|They)\\s+doesn't\\s+(?:VERB|react|warn|speak)[.!?]\\s+It\\s+\\*(?:VERB|whispers?|reminds?|signals?)`, 'gi');

// 14. Better dash patterns with VERB - simplified with extracted constants
export const RE_POS_DASH_VERB_BROAD = new RegExp(`\\b${NEG_CONTR_EXT}\\s+just\\s+(?:VERB|(?:the|a)\\s+\\w+)[^-]{0,40}?-\\s*${SUBJ_IT_THEY}\\s+(?:${VERB_BE_ALL}|${VERB_BE_CONTR})?\\s*${EMPH_MARK}(?:VERB|(?:the|a)\\s+${EMPH_MARK}\\w+)`, 'gi');

// 15. Ellipsis patterns - broader
export const RE_POS_ELLIPSIS_BROAD = new RegExp(`${Q}\\s*(?:${NQ}{0,100}?\\b)?(?:They're|You're|This)\\s+(?:not\\s+just|isn't)\\s+(?:VERB|a\\s+\\w+)${NQ}{0,40}?[.…]\\s*[.…]\\s*(?:they're|it's|you're|this)\\s+(?:VERB|a\\s+\\w+)`, 'gi');

// 16. "not because X. It's because Y"
export const RE_POS_NOT_BECAUSE = /\bit's\s+not\s+because\s+[^.!?]{5,60}?[.!?]\s+(?:It's|That's)\s+because\s+[^.!?]{5,60}/gi;

// 17. Fragment with gerunds
export const RE_POS_GERUND_BROAD = new RegExp(`${Q}\\s*Not\\s+just\\s+VERB[.!?]\\s+\\*VERB[.!?]?`, 'g');

// 18. Complex quoted multi-sentence with VERBing
export const RE_POS_QUOTE_VERBING = new RegExp(`${Q}\\s*(?:You're|They're|It's)\\s+not\\s+(?:just\\s+)?VERB${NQ}{0,30}?[.,]\\s+${NQ}{0,50}?(?:You're|They're|It's)\\s+(?:VERB|waiting)`, 'gi');

// 19. "doesn't verb. It *verb*" literal
export const RE_POS_DOESNT_LITERAL = new RegExp(`${Q}\\s*(?:The\\s+\\w+|It|They)\\s+doesn't\\s+(?:VERB|react|warn|speak|listen)\\s*[.!?]\\s+It\\s+\\*\\w+\\*`, 'gi');

// 20. "not just a NOUN—it was a *NOUN*" - simplified with extracted constants
export const RE_POS_DASH_NOUN_SWAP = new RegExp(`\\b${VERB_BE_ALL}\\s+not\\s+just\\s+a\\s+\\w+[^-]{0,10}?-\\s*${SUBJ_IT_THEY}\\s+${VERB_BE_ALL}\\s+(?:a\\s+)?\\*\\w+\\*`, 'gi');

// 21. "isn't just VERB/noun—it's VERBing/noun"
export const RE_POS_ISNT_DASH_EMPHASIS = new RegExp(`${Q}\\s*(?:The\\s+\\w+|It|They)\\s+(?:isn't|aren't|wasn't|weren't)\\s+just\\s+(?:VERB|a\\s+\\w+)[^-]{0,40}?-\\s*(?:it's|they're)\\s+\\*\\w+\\*`, 'gi');

// 22. "That's not a NOUN. That's a *NOUN*"
export const RE_POS_THATS_NOT_NOUN = new RegExp(`${Q}\\s*That's\\s+not\\s+(?:a\\s+)?(?:sign|message|pattern|phenomenon|test|one\\s+\\w+|\\w+)[.!?]\\s+(?:That's|It's)\\s+(?:a\\s+)?\\*\\w+\\*`, 'gi');

// 23. "not just VERB. *VERBing*"
export const RE_POS_GERUND_EMPHASIS = new RegExp(`${Q}\\s*Not\\s+just\\s+(?:VERB|reacting|dying|\\w+ing)[.!?]\\s+\\*[A-Z]\\w+\\*`, 'g');

// 24. "are not just VERBing. They're VERBing"
export const RE_POS_QUOTE_ATTRIBUTION_VERB = new RegExp(`${Q}\\s*(?:The\\s+\\w+|They)\\s+(?:are|were|'re)\\s+not\\s+just\\s+VERB,"\\s+${NQ}{0,30}?\\.\\s+"They're\\s+\\*?VERB`, 'gi');

// 25. "isn't just a NOUN. It's a *NOUN*"
export const RE_POS_ISNT_NOUN = new RegExp(`${Q}\\s*(?:This|That|It)\\s+isn't\\s+just\\s+a\\s+\\w+[.!?]\\s+It's\\s+(?:a\\s+)?\\*\\w+\\*`, 'gi');

// 26. "It's not just NOUN. It's *NOUN*"
export const RE_POS_ITS_NOT_JUST = new RegExp(`${Q}\\s*It's\\s+not\\s+just\\s+(?:one\\s+)?(\\w+)[.!?]\\s+It's\\s+\\*(?:all|every|each|\\w+)\\*`, 'gi');

// 27. "They're not just VERBing X—they're *VERBing*"
export const RE_POS_DASH_GERUND_OBJ = new RegExp(`${Q}\\s*(?:They're|You're|It's)\\s+not\\s+just\\s+(?:VERB|emitting|dying|\\w+ing)\\s+(?:a|an|the)\\s+\\w+[^-]{0,10}?-\\s*(?:they're|you're|it's)\\s+\\*\\w+\\*`, 'gi');

// 28. Ellipsis with dialogue attribution
export const RE_POS_ELLIPSIS_DIALOGUE = new RegExp(`${Q}\\s*(?:They're|You're|It's)\\s+not\\s+just\\s+VERB,"\\s+${NQ}{5,40}?\\.\\s+"(?:They're|You're|It's)[…\\s]+(?:VERB|\\w+ing)`, 'gi');

// 29. "were not just NOUN; they were NOUN"
export const RE_POS_SEMI_NOUN = new RegExp(`\\b${VERB_BE_ALL}\\s+not\\s+just\\s+(?:folklore|\\w+);\\s+${SUBJ_IT_THEY}\\s+${VERB_BE_ALL}\\s+a\\s+\\w+`, 'gi');

// 30. "isn't just a NOUN. It's a *NOUN*" with adj
export const RE_POS_ISNT_ADJ_NOUN = new RegExp(`${Q}\\s*(?:${NQ}{0,30}?\\b)?(?:this|that|it)\\s+isn't\\s+just\\s+a\\s+(?:natural\\s+)?\\w+[.!?]\\s+It's\\s+(?:a\\s+)?\\*\\w+\\*`, 'gi');

// 31. Dialogue attribution: "not just X," he said. "Y"
export const RE_POS_DIALOGUE_ATTR = new RegExp(`${Q}\\s*(?:You're|They're|It's|The\\s+\\w+)\\s+(?:(?:are|is|'re|'s)\\s+)?not\\s+just\\s+(?:VERB(?:\\s+\\w+)?|a\\s+\\w+),"\\s+${NQ}{3,50}?\\.\\s+"(?:You're|They're|It's)\\s+(?:a\\s+)?\\*\\w+\\*`, 'gi');

// 32. "To VERB that X isn't just Y. It's *Z*"
export const RE_POS_TO_VERB_ISNT = new RegExp(`${Q}\\s*To\\s+VERB\\s+(?:that\\s+)?${NQ}{5,50}?isn't\\s+just\\s+a\\s+\\w+[.!?]\\s+It's\\s+(?:a\\s+)?\\*\\w+\\*`, 'gi');

// 33. "I am not VERBing X; it is Y"
export const RE_POS_I_AM_NOT_SEMI = /\bI\s+am\s+not\s+VERB[^;]{5,80}?;\s*it\s+is\b/gi;

// 34. "It's not NAME anymore. It's NAME"
export const RE_POS_NOT_ANYMORE_ITS = /\bIt's\s+not\s+[A-Z]\w+\s+anymore[.!?]\s+It's\s+[A-Z]\w+/g;

// 35. "That/This ain't X. They/It Y"
export const RE_POS_AINT_SIMPLE = /\b(?:That|This)\s+ain't\s+[^.!?]{3,40}?[.!?]\s+(?:They|It)\s+\w+/gi;

export const STAGE2_REGEXES: Record<string, RegExp> = {
  "POS_DOESNT_VERB": RE_POS_DOESNT_VERB,
  "POS_DONT_JUST_VERB": RE_POS_DONT_JUST_VERB,
  "POS_GERUND_FRAGMENT": RE_POS_GERUND_FRAGMENT,
  "POS_NOT_ADJ": RE_POS_NOT_ADJ,
  "POS_DASH_VERB": RE_POS_DASH_VERB,
  "POS_NOT_JUST_VERB_PAST": RE_POS_NOT_JUST_VERB_PAST,
  "POS_COLON_VERB": RE_POS_COLON_VERB,
  "POS_ISNT_JUST_VERB": RE_POS_ISNT_JUST_VERB,
  "POS_QUOTE_MULTI_VERB": RE_POS_QUOTE_MULTI_VERB,
  "POS_ELLIPSIS_VERB": RE_POS_ELLIPSIS_VERB,
  "POS_NOT_NOUN": RE_POS_NOT_NOUN,
  "POS_DOESNT_VERB_EMPHASIS": RE_POS_DOESNT_VERB_EMPHASIS,
  "POS_DASH_VERB_BROAD": RE_POS_DASH_VERB_BROAD,
  "POS_ELLIPSIS_BROAD": RE_POS_ELLIPSIS_BROAD,
  "POS_NOT_BECAUSE": RE_POS_NOT_BECAUSE,
  "POS_GERUND_BROAD": RE_POS_GERUND_BROAD,
  "POS_QUOTE_VERBING": RE_POS_QUOTE_VERBING,
  "POS_DOESNT_LITERAL": RE_POS_DOESNT_LITERAL,
  "POS_DASH_NOUN_SWAP": RE_POS_DASH_NOUN_SWAP,
  "POS_ISNT_DASH_EMPHASIS": RE_POS_ISNT_DASH_EMPHASIS,
  "POS_THATS_NOT_NOUN": RE_POS_THATS_NOT_NOUN,
  "POS_GERUND_EMPHASIS": RE_POS_GERUND_EMPHASIS,
  "POS_QUOTE_ATTRIBUTION_VERB": RE_POS_QUOTE_ATTRIBUTION_VERB,
  "POS_ISNT_NOUN": RE_POS_ISNT_NOUN,
  "POS_ITS_NOT_JUST": RE_POS_ITS_NOT_JUST,
  "POS_DASH_GERUND_OBJ": RE_POS_DASH_GERUND_OBJ,
  "POS_ELLIPSIS_DIALOGUE": RE_POS_ELLIPSIS_DIALOGUE,
  "POS_SEMI_NOUN": RE_POS_SEMI_NOUN,
  "POS_ISNT_ADJ_NOUN": RE_POS_ISNT_ADJ_NOUN,
  "POS_DIALOGUE_ATTR": RE_POS_DIALOGUE_ATTR,
  "POS_TO_VERB_ISNT": RE_POS_TO_VERB_ISNT,
  "POS_I_AM_NOT_SEMI": RE_POS_I_AM_NOT_SEMI,
  "POS_NOT_ANYMORE_ITS": RE_POS_NOT_ANYMORE_ITS,
  "POS_AINT_SIMPLE": RE_POS_AINT_SIMPLE,
  "LEMMA_SAME_VERB": RE_LEMMA_SAME_VERB,
};
