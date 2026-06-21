export const CLAUDE_MODELS = [
  { id: "opus", name: "Opus", version: "4.8" },
  { id: "sonnet", name: "Sonnet", version: "4.6" },
  { id: "haiku", name: "Haiku", version: "4.5" },
]

export type CodexThinkingLevel = "low" | "medium" | "high" | "xhigh"

/** Codex models that require ChatGPT sign-in (not available with API key auth). */
export const CODEX_SUBSCRIPTION_ONLY_MODEL_IDS = [
  "gpt-5.3-codex-spark",
] as const

export const CODEX_MODELS = [
  {
    id: "gpt-5.5",
    name: "GPT-5.5",
    thinkings: ["low", "medium", "high", "xhigh"] as CodexThinkingLevel[],
  },
  {
    id: "gpt-5.4",
    name: "GPT-5.4",
    thinkings: ["low", "medium", "high", "xhigh"] as CodexThinkingLevel[],
  },
  {
    id: "gpt-5.4-mini",
    name: "GPT-5.4 Mini",
    thinkings: ["low", "medium", "high"] as CodexThinkingLevel[],
  },
  {
    id: "gpt-5.3-codex-spark",
    name: "Codex Spark",
    thinkings: ["medium", "high"] as CodexThinkingLevel[],
  },
]

export function formatCodexThinkingLabel(thinking: CodexThinkingLevel): string {
  if (thinking === "xhigh") return "Extra High"
  return thinking.charAt(0).toUpperCase() + thinking.slice(1)
}

export const CURSOR_MODELS = [
  { id: "composer-2.5", name: "Composer 2.5" },
  { id: "composer-2.5-fast", name: "Composer 2.5 Fast" },
  { id: "claude-4.6-sonnet-medium", name: "Sonnet 4.6" },
  { id: "claude-4.6-sonnet-medium-thinking", name: "Sonnet 4.6 Thinking" },
  { id: "claude-opus-4-8-high", name: "Opus 4.8" },
  { id: "gpt-5.5-medium", name: "GPT-5.5" },
  { id: "gpt-5.4-medium", name: "GPT-5.4" },
  { id: "gpt-5.3-codex", name: "Codex 5.3" },
  { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro" },
]

export const CURSOR_MODEL_IDS = new Set(CURSOR_MODELS.map((model) => model.id))
