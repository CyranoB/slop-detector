import { z } from "zod";
import { slopScoreService } from "../slopScoreService.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const schemaShape = {
  text: z.string().min(1, "text must be non-empty"),
};

export const scoreTextInputSchema = z.object(schemaShape);

export async function scoreTextToolHandler(raw: unknown): Promise<CallToolResult> {
  const parsed = scoreTextInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      content: [{ type: "text" as const, text: parsed.error.issues[0]?.message || "Invalid input" }],
      isError: true,
    };
  }

  const text = parsed.data.text.trim();
  if (!text) {
    return {
      content: [{ type: "text" as const, text: "text must be non-empty" }],
      isError: true,
    };
  }

  const result = await slopScoreService.computeScoreFromText(text, "en");

  return {
    content: [
      {
        type: "text" as const,
        text: `SLOP Score: ${result.slopScore}/100\nWord Count: ${result.wordCount}\nChar Count: ${result.charCount}\n\nMetrics:\n- Words per 1k: ${result.metrics?.slop_list_matches_per_1k_words.toFixed(2)}\n- Trigrams per 1k: ${result.metrics?.slop_trigram_matches_per_1k_words.toFixed(2)}\n- Contrast per 1k chars: ${result.metrics?.not_x_but_y_per_1k_chars.toFixed(2)}`,
      },
    ],
    isError: false,
  };
}
