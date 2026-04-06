import { describe, it, expect } from 'vitest';
import { scoreTropes, type TropeScoreResult } from '../eqbench/tropeDetector.js';

function countHits(result: TropeScoreResult, tropeName: string): number {
  return result.matches.filter(m => m.trope_name === tropeName).length;
}

function score(text: string, rawText?: string): TropeScoreResult {
  return scoreTropes(text, rawText ?? text);
}

describe('tropeDetector', () => {
  describe('phrase-based tropes', () => {
    it('detects filler transitions', () => {
      const r = score("It's worth noting that AI detection is complex. It should be noted that patterns vary.");
      expect(countHits(r, 'filler_transitions')).toBe(2);
    });

    it('detects false suspense', () => {
      const r = score("Here's the thing about language models. Here's the kicker though.");
      expect(countHits(r, 'false_suspense')).toBe(2);
    });

    it('detects serves-as dodge', () => {
      const r = score("This serves as a reminder. It stands as a testament to progress.");
      expect(countHits(r, 'serves_as_dodge')).toBe(2);
    });

    it('detects signposted conclusions', () => {
      const r = score("In conclusion, we should consider the implications. To sum up, progress has been made.");
      expect(countHits(r, 'signposted_conclusion')).toBe(2);
    });

    it('detects pedagogical voice', () => {
      const r = score("Let's break this down. Let's take a closer look at the evidence.");
      expect(countHits(r, 'pedagogical_voice')).toBe(2);
    });

    it('detects think-of-it-as', () => {
      expect(countHits(score("Think of it as a blueprint for success."), 'think_of_it_as')).toBe(1);
    });

    it('detects imagine-a-world', () => {
      expect(countHits(score("Imagine a world where everyone has access to clean energy."), 'imagine_a_world')).toBe(1);
    });

    it('detects truth-is-simple', () => {
      expect(countHits(score("The truth is, most people underestimate the complexity."), 'truth_is_simple')).toBe(1);
    });

    it('detects grandiose stakes', () => {
      expect(countHits(score("This will fundamentally reshape how we think about education."), 'grandiose_stakes')).toBe(1);
    });

    it('does not false-positive on normal prose', () => {
      const r = score("The cat sat on the mat. It was a quiet afternoon. She picked up the book and began to read.");
      expect(r.matches.length).toBe(0);
    });
  });

  describe('regex-based tropes', () => {
    it('detects countdown pattern "Not X. Not Y. Just Z."', () => {
      expect(countHits(score("Not a failure. Not a setback. Just a learning experience."), 'countdown_pattern')).toBe(1);
    });

    it('detects rhetorical self-Q&A', () => {
      expect(countHits(score("The result? A complete transformation of the industry."), 'rhetorical_self_qa')).toBe(1);
    });

    it('detects "despite its challenges"', () => {
      expect(countHits(score("Despite its challenges, the project succeeded beyond expectations."), 'despite_challenges')).toBe(1);
    });

    it('detects participle openings', () => {
      const r = score("Building on this insight, we can see the pattern. Looking at the data more closely, trends emerge.");
      expect(countHits(r, 'participle_openings')).toBe(2);
    });

    it('detects vague attributions', () => {
      const r = score("Experts say this could transform the field. Researchers suggest further study is needed.");
      expect(countHits(r, 'vague_attributions')).toBe(2);
    });
  });

  describe('formatting tropes (raw text)', () => {
    it('detects em-dash addiction in raw text', () => {
      // 10 em-dashes in ~200 chars = ~50/1k, well above threshold
      const raw = "This \u2014 is \u2014 a \u2014 test \u2014 of \u2014 em \u2014 dash \u2014 overuse \u2014 in \u2014 writing \u2014 ok.";
      expect(countHits(score(raw), 'em_dash_addiction')).toBe(1);
    });

    it('does not flag normal em-dash usage', () => {
      const raw = "The project \u2014 which started last year \u2014 has been a remarkable success for the entire organization. The team worked through many challenges along the way, addressing technical debt and improving the architecture at every stage. Their dedication and persistence paid off in the end, resulting in a product that exceeded all initial expectations. The stakeholders were pleased with the outcome and the board approved further investment into the next phase of development.";
      expect(countHits(score(raw), 'em_dash_addiction')).toBe(0);
    });

    it('detects bold-first bullets in raw markdown', () => {
      const raw = "Some intro text.\n- **Feature:** Does the thing\n- **Benefit:** Makes it better\n- **Outcome:** All good";
      const normalized = "Some intro text. Feature: Does the thing Benefit: Makes it better Outcome: All good";
      expect(countHits(score(normalized, raw), 'bold_first_bullets')).toBe(1);
    });

    it('detects unicode decoration overuse', () => {
      const raw = "\u2192 Step one \u2192 Step two \u2192 Step three \u2714 Done \u2714 Verified \u2714 Confirmed \u2728 Magic \u2728 Great";
      expect(countHits(score(raw), 'unicode_decoration')).toBe(1);
    });
  });

  describe('statistical tropes', () => {
    it('detects anaphora abuse', () => {
      const r = score("We must act now. We must be bold. We must not waver. We must lead.");
      expect(countHits(r, 'anaphora_abuse')).toBe(1);
      expect(r.matches.find(m => m.trope_name === 'anaphora_abuse')!.match_text).toContain('4 consecutive');
    });

    it('does not flag non-consecutive anaphora', () => {
      expect(countHits(score("We should act. They will follow. We need courage. They have vision."), 'anaphora_abuse')).toBe(0);
    });

    it('detects short punchy fragment overuse', () => {
      expect(countHits(score("Power. Influence. Control. These matter. They always have. Always will. No exceptions. Ever."), 'short_punchy_fragments')).toBe(1);
    });

    it('does not flag normal sentence variety', () => {
      const r = score("The research team published their findings last week in a major journal. The results showed significant improvement across all measured metrics. However, some limitations were noted by the reviewers. Additional studies will be needed to confirm these preliminary results.");
      expect(countHits(r, 'short_punchy_fragments')).toBe(0);
    });
  });

  describe('integration', () => {
    it('detects multiple tropes in AI-typical text', () => {
      const r = score("Here's the thing about modern technology. It's worth noting that despite its challenges, AI serves as a fundamentally transformative force. In conclusion, let's break this down: the truth is, this will reshape the way we live.");
      expect(r.hits).toBeGreaterThanOrEqual(5);
      expect(r.rate_per_1k).toBeGreaterThan(0);

      const tropeNames = new Set(r.matches.map(m => m.trope_name));
      expect(tropeNames.has('false_suspense')).toBe(true);
      expect(tropeNames.has('filler_transitions')).toBe(true);
      expect(tropeNames.has('signposted_conclusion')).toBe(true);
    });

    it('returns zero hits for clean human prose', () => {
      const r = score("She opened the door and stepped outside. The morning air was crisp, carrying the smell of pine from the nearby forest. A dog barked somewhere in the distance. She pulled her jacket tighter and started walking toward the bus stop, her mind already on the meeting ahead.");
      expect(r.hits).toBe(0);
    });
  });
});
