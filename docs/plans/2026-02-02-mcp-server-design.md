# MCP Server Design for slop-detector (stdio)

## Goal
Expose a single MCP tool, `score_text`, that computes SLOP score metrics from raw text using the existing `slop-detector` library.

## Scope
- Transport: stdio (per MCP spec)
- Capabilities: tools only
- Single tool: `score_text`
- No resources or prompts in v1

## References
- https://modelcontextprotocol.io/docs/develop/build-server.md
- https://modelcontextprotocol.io/specification/2025-11-25/basic/transports.md
- https://modelcontextprotocol.io/specification/2025-11-25/server/tools.md

## Architecture
- Add MCP server entrypoint in repo (e.g., `src/mcpServer.ts`).
- Use `@modelcontextprotocol/sdk` with `McpServer` and `StdioServerTransport`.
- Reuse existing pipeline: `stripHtml` -> `stripMarkdown` -> `computeEqBenchScore`.
- Build output via existing `tsc` pipeline into `dist/mcpServer.js`.

## Tool Design
### Tool name
`score_text`

### Input schema
```
{
  "type": "object",
  "properties": {
    "text": { "type": "string", "description": "Raw text to score" }
  },
  "required": ["text"],
  "additionalProperties": false
}
```

### Output
- Unstructured `content` text: summary (score, word count, key metrics).
- Structured `structuredContent` JSON:
  - `slopScore` (number)
  - `wordCount` (number)
  - `charCount` (number)
  - `metrics` (object)
  - `details` (object with word hits, trigram hits, contrast matches)

## Data Flow
1. Validate input (`text` non-empty string).
2. Normalize: `stripHtml` -> `stripMarkdown`.
3. Compute: `computeEqBenchScore`.
4. Return tool result with `content` and `structuredContent`.

## Error Handling
- Input validation errors: return tool execution error (`isError: true`) with actionable message.
- Runtime failures: log to stderr only; return `isError: true` with sanitized message.

## Logging
- STDIO transport: never write to stdout.
- All logs go to stderr (`console.error`).

## Testing
- Unit test tool handler directly with `vitest`:
  - Empty input -> `isError: true`.
  - Known sample -> score and metrics shape.
  - Structured content shape matches schema.

## Distribution
- Add npm script to run MCP server (e.g., `npm run mcp` -> `node dist/mcpServer.js`).
- Document Claude Desktop config example in README.

## Open Questions
- None for v1 (single tool, stdio transport).
