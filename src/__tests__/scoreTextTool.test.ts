import { describe, it, expect } from "vitest";
import { scoreTextToolHandler } from "../mcp/scoreTextTool.js";

describe("scoreTextToolHandler", () => {
  it("returns error on empty input", async () => {
    const result = await scoreTextToolHandler({ text: "   " });
    expect(result.isError).toBe(true);
  });

  it("returns content with SLOP score metrics", async () => {
    const result = await scoreTextToolHandler({ text: "This is a simple human sentence." });
    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(1);
    const textContent = result.content[0];
    expect(textContent.type).toBe("text");
    if (textContent.type === "text") {
      expect(textContent.text).toContain("SLOP Score:");
      expect(textContent.text).toContain("Word Count:");
    }
  });
});
