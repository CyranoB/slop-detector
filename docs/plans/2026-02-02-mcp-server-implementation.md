# MCP Server Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a stdio MCP server exposing a `score_text` tool backed by the existing slop scoring pipeline.

**Architecture:** Create a tool handler module that validates input and returns both `content` and `structuredContent`. Wire it into an MCP server entrypoint using `McpServer` + `StdioServerTransport`, with stderr-only logging.

**Tech Stack:** Node 18+, TypeScript, `@modelcontextprotocol/sdk`, `vitest`, existing `slop-detector` modules.

---

### Task 1: Add MCP dependencies and scripts

**Files:**
- Modify: `package.json`

**Step 1: Add dependencies**
- Add `@modelcontextprotocol/sdk` to `dependencies`
- Add `zod` to `dependencies` (for input schema)

**Step 2: Add npm script**
- Add `"mcp": "npm run build && node dist/mcpServer.js"`

**Step 3: Install**
- Run: `npm install`
- Expected: packages added, no errors

---

### Task 2: Create score_text tool handler (TDD)

**Files:**
- Create: `src/mcp/scoreTextTool.ts`
- Create: `src/__tests__/scoreTextTool.test.ts`

**Step 1: Write failing test**

```ts
import { describe, it, expect } from "vitest";
import { scoreTextToolHandler } from "../mcp/scoreTextTool.js";

describe("scoreTextToolHandler", () => {
  it("returns error on empty input", async () => {
    const result = await scoreTextToolHandler({ text: "   " });
    expect(result.isError).toBe(true);
  });

  it("returns structured content with metrics", async () => {
    const result = await scoreTextToolHandler({ text: "This is a simple human sentence." });
    expect(result.isError).toBe(false);
    expect(result.structuredContent).toHaveProperty("slopScore");
    expect(result.structuredContent).toHaveProperty("metrics.slop_list_matches_per_1k_words");
  });
});
```

**Step 2: Run test to verify it fails**
- Run: `npx vitest run src/__tests__/scoreTextTool.test.ts`
- Expected: FAIL (module or function missing)

**Step 3: Implement minimal handler**

```ts
import { z } from "zod";
import { slopScoreService } from "../slopScoreService.js";

export const scoreTextInputSchema = z.object({
  text: z.string().min(1, "text must be non-empty"),
});

export async function scoreTextToolHandler(raw: unknown) {
  const parsed = scoreTextInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      content: [{ type: "text", text: parsed.error.issues[0]?.message || "Invalid input" }],
      isError: true,
    };
  }

  const { text } = parsed.data;
  const result = await slopScoreService.computeScoreFromText(text, "en");

  return {
    content: [
      {
        type: "text",
        text: `SLOP Score: ${result.slopScore}/100\nWord Count: ${result.wordCount}\nChar Count: ${result.charCount}`,
      },
    ],
    structuredContent: result,
  };
}
```

**Step 4: Run test to verify it passes**
- Run: `npx vitest run src/__tests__/scoreTextTool.test.ts`
- Expected: PASS

---

### Task 3: Add MCP server entrypoint (stdio)

**Files:**
- Create: `src/mcpServer.ts`

**Step 1: Implement MCP server**

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { scoreTextInputSchema, scoreTextToolHandler } from "./mcp/scoreTextTool.js";

const server = new McpServer({
  name: "slop-detector",
  version: "1.0.0",
  capabilities: { tools: { listChanged: false } },
});

server.registerTool(
  "score_text",
  {
    description: "Compute SLOP score and metrics for raw text",
    inputSchema: scoreTextInputSchema,
  },
  async (args) => scoreTextToolHandler(args),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("slop-detector MCP server running (stdio)");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

**Step 2: Build**
- Run: `npm run build`
- Expected: `dist/mcpServer.js` created

---

### Task 4: Document MCP usage

**Files:**
- Modify: `README.md`

**Step 1: Add README section**
- Add "MCP Server (stdio)" with:
  - Build/run: `npm run mcp`
  - Claude Desktop config snippet:

```json
{
  "mcpServers": {
    "slop-detector": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/slop-detector/dist/mcpServer.js"]
    }
  }
}
```

---

### Task 5: Smoke test

**Step 1: Build and run**
- Run: `npm run mcp`
- Expected: process stays open, stderr logs "MCP server running"

**Step 2: Stop**
- Ctrl+C, ensure no stdout output was written.
