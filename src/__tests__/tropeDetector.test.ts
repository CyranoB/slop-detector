import { describe, it, expect } from 'vitest';
import { scoreTropes } from '../eqbench/tropeDetector.js';

describe('tropeDetector', () => {
  describe('phrase-based tropes', () => {
    it('detects filler transitions', () => {
      const text = "It's worth noting that AI detection is complex. It should be noted that patterns vary.";
      const result = scoreTropes(text, text);
      const fillerHits = result.matches.filter(m => m.trope_name === 'filler_transitions');
      expect(fillerHits.length).toBe(2);
    });

    it('detects false suspense', () => {
      const text = "Here's the thing about language models. Here's the kicker though.";
      const result = scoreTropes(text, text);
      const hits = result.matches.filter(m => m.trope_name === 'false_suspense');
      expect(hits.length).toBe(2);
    });

    it('detects serves-as dodge', () => {
      const text = "This serves as a reminder. It stands as a testament to progress.";
      const result = scoreTropes(text, text);
      const hits = result.matches.filter(m => m.trope_name === 'serves_as_dodge');
      expect(hits.length).toBe(2);
    });

    it('detects signposted conclusions', () => {
      const text = "In conclusion, we should consider the implications. To sum up, progress has been made.";
      const result = scoreTropes(text, text);
      const hits = result.matches.filter(m => m.trope_name === 'signposted_conclusion');
      expect(hits.length).toBe(2);
    });

    it('detects pedagogical voice', () => {
      const text = "Let's break this down. Let's take a closer look at the evidence.";
      const result = scoreTropes(text, text);
      const hits = result.matches.filter(m => m.trope_name === 'pedagogical_voice');
      expect(hits.length).toBe(2);
    });

    it('detects think-of-it-as', () => {
      const text = "Think of it as a blueprint for success.";
      const result = scoreTropes(text, text);
      const hits = result.matches.filter(m => m.trope_name === 'think_of_it_as');
      expect(hits.length).toBe(1);
    });

    it('detects imagine-a-world', () => {
      const text = "Imagine a world where everyone has access to clean energy.";
      const result = scoreTropes(text, text);
      const hits = result.matches.filter(m => m.trope_name === 'imagine_a_world');
      expect(hits.length).toBe(1);
    });

    it('detects truth-is-simple', () => {
      const text = "The truth is, most people underestimate the complexity.";
      const result = scoreTropes(text, text);
      const hits = result.matches.filter(m => m.trope_name === 'truth_is_simple');
      expect(hits.length).toBe(1);
    });

    it('detects grandiose stakes', () => {
      const text = "This will fundamentally reshape how we think about education.";
      const result = scoreTropes(text, text);
      const hits = result.matches.filter(m => m.trope_name === 'grandiose_stakes');
      expect(hits.length).toBe(1);
    });

    it('does not false-positive on normal prose', () => {
      const text = "The cat sat on the mat. It was a quiet afternoon. She picked up the book and began to read.";
      const result = scoreTropes(text, text);
      expect(result.matches.length).toBe(0);
    });
  });

  describe('regex-based tropes', () => {
    it('detects countdown pattern "Not X. Not Y. Just Z."', () => {
      const text = "Not a failure. Not a setback. Just a learning experience.";
      const result = scoreTropes(text, text);
      const hits = result.matches.filter(m => m.trope_name === 'countdown_pattern');
      expect(hits.length).toBe(1);
    });

    it('detects rhetorical self-Q&A', () => {
      const text = "The result? A complete transformation of the industry.";
      const result = scoreTropes(text, text);
      const hits = result.matches.filter(m => m.trope_name === 'rhetorical_self_qa');
      expect(hits.length).toBe(1);
    });

    it('detects "despite its challenges"', () => {
      const text = "Despite its challenges, the project succeeded beyond expectations.";
      const result = scoreTropes(text, text);
      const hits = result.matches.filter(m => m.trope_name === 'despite_challenges');
      expect(hits.length).toBe(1);
    });

    it('detects participle openings', () => {
      const text = "Building on this insight, we can see the pattern. Looking at the data more closely, trends emerge.";
      const result = scoreTropes(text, text);
      const hits = result.matches.filter(m => m.trope_name === 'participle_openings');
      expect(hits.length).toBe(2);
    });

    it('detects vague attributions', () => {
      const text = "Experts say this could transform the field. Researchers suggest further study is needed.";
      const result = scoreTropes(text, text);
      const hits = result.matches.filter(m => m.trope_name === 'vague_attributions');
      expect(hits.length).toBe(2);
    });
  });

  describe('formatting tropes (raw text)', () => {
    it('detects em-dash addiction in raw text', () => {
      // 10 em-dashes in ~200 chars = ~50/1k, well above threshold
      const rawText = "This \u2014 is \u2014 a \u2014 test \u2014 of \u2014 em \u2014 dash \u2014 overuse \u2014 in \u2014 writing \u2014 ok.";
      const result = scoreTropes(rawText, rawText);
      const hits = result.matches.filter(m => m.trope_name === 'em_dash_addiction');
      expect(hits.length).toBe(1);
    });

    it('does not flag normal em-dash usage', () => {
      // 2 em-dashes in ~700 chars = ~2.9/1k, below threshold of 3.0
      const rawText = "The project \u2014 which started last year \u2014 has been a remarkable success for the entire organization. The team worked through many challenges along the way, addressing technical debt and improving the architecture at every stage. Their dedication and persistence paid off in the end, resulting in a product that exceeded all initial expectations. The stakeholders were pleased with the outcome and the board approved further investment into the next phase of development.";
      const result = scoreTropes(rawText, rawText);
      const hits = result.matches.filter(m => m.trope_name === 'em_dash_addiction');
      expect(hits.length).toBe(0);
    });

    it('detects bold-first bullets in raw markdown', () => {
      const rawText = "Some intro text.\n- **Feature:** Does the thing\n- **Benefit:** Makes it better\n- **Outcome:** All good";
      const normalized = "Some intro text. Feature: Does the thing Benefit: Makes it better Outcome: All good";
      const result = scoreTropes(normalized, rawText);
      const hits = result.matches.filter(m => m.trope_name === 'bold_first_bullets');
      expect(hits.length).toBe(1);
    });

    it('detects unicode decoration overuse', () => {
      // Pack many unicode decorations into a short text
      const rawText = "\u2192 Step one \u2192 Step two \u2192 Step three \u2714 Done \u2714 Verified \u2714 Confirmed \u2728 Magic \u2728 Great";
      const result = scoreTropes(rawText, rawText);
      const hits = result.matches.filter(m => m.trope_name === 'unicode_decoration');
      expect(hits.length).toBe(1);
    });
  });

  describe('statistical tropes', () => {
    it('detects anaphora abuse', () => {
      const text = "We must act now. We must be bold. We must not waver. We must lead.";
      const result = scoreTropes(text, text);
      const hits = result.matches.filter(m => m.trope_name === 'anaphora_abuse');
      expect(hits.length).toBe(1);
      expect(hits[0]!.match_text).toContain('4 consecutive');
    });

    it('does not flag non-consecutive anaphora', () => {
      const text = "We should act. They will follow. We need courage. They have vision.";
      const result = scoreTropes(text, text);
      const hits = result.matches.filter(m => m.trope_name === 'anaphora_abuse');
      expect(hits.length).toBe(0);
    });

    it('detects short punchy fragment overuse', () => {
      const text = "Power. Influence. Control. These matter. They always have. Always will. No exceptions. Ever.";
      const result = scoreTropes(text, text);
      const hits = result.matches.filter(m => m.trope_name === 'short_punchy_fragments');
      expect(hits.length).toBe(1);
    });

    it('does not flag normal sentence variety', () => {
      const text = "The research team published their findings last week in a major journal. The results showed significant improvement across all measured metrics. However, some limitations were noted by the reviewers. Additional studies will be needed to confirm these preliminary results.";
      const result = scoreTropes(text, text);
      const hits = result.matches.filter(m => m.trope_name === 'short_punchy_fragments');
      expect(hits.length).toBe(0);
    });
  });

  describe('integration', () => {
    it('detects multiple tropes in AI-typical text', () => {
      const text = "Here's the thing about modern technology. It's worth noting that despite its challenges, AI serves as a fundamentally transformative force. In conclusion, let's break this down: the truth is, this will reshape the way we live.";
      const result = scoreTropes(text, text);
      expect(result.hits).toBeGreaterThanOrEqual(5);
      expect(result.rate_per_1k).toBeGreaterThan(0);

      const tropeNames = new Set(result.matches.map(m => m.trope_name));
      expect(tropeNames.has('false_suspense')).toBe(true);
      expect(tropeNames.has('filler_transitions')).toBe(true);
      expect(tropeNames.has('signposted_conclusion')).toBe(true);
    });

    it('returns zero hits for clean human prose', () => {
      const text = "She opened the door and stepped outside. The morning air was crisp, carrying the smell of pine from the nearby forest. A dog barked somewhere in the distance. She pulled her jacket tighter and started walking toward the bus stop, her mind already on the meeting ahead.";
      const result = scoreTropes(text, text);
      expect(result.hits).toBe(0);
    });
  });
});
