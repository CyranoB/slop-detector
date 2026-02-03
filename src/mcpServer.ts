#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { scoreTextToolHandler } from "./mcp/scoreTextTool.js";

const server = new McpServer(
  {
    name: "slop-detector",
    version: "1.0.0",
  },
  {
    capabilities: { tools: {} },
    instructions: `SLOP Score Detector analyzes text for AI-generated patterns.

Score Interpretation:
- 0-20: Very human-like, natural writing
- 20-40: Mostly human with some AI characteristics  
- 40-60: Mixed characteristics, unclear origin
- 60-80: Likely AI-generated with some editing
- 80-100: Strong AI signature, minimal human intervention

Note: Scores above 30 are suspiciously AI-like and warrant attention.

Use the score_text tool to analyze any text. The tool returns a score (0-100, higher = more AI-like) plus detailed metrics on word hits, trigram matches, and contrast patterns.`,
  }
);

// Use any to bypass complex type checking issues
(server as any).registerTool(
  "score_text",
  {
    description: `Compute SLOP score for text to detect AI-generated patterns.

Returns a 0-100 score:
- 0-20: Very human-like
- 20-40: Mostly human
- 40-60: Mixed/unclear
- 60-80: Likely AI-generated
- 80-100: Strong AI signature

Scores above 30 are suspiciously AI-like.

Also returns metrics: word hits, trigram matches, and contrast patterns per 1k words/chars.`,
    inputSchema: z.object({
      text: z.string().min(1, "text must be non-empty"),
    }),
  },
  scoreTextToolHandler,
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("slop-detector MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
