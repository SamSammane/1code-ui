import type { TRPCLink } from "@trpc/client"
import { observable } from "@trpc/server/observable"
import type { AppRouter } from "../../../main/lib/trpc/routers"
import {
  createChat,
  createProject,
  getChat,
  getProject,
  listArchivedChats,
  listChats,
  listProjects,
} from "./web-store"

type OpPath = string

function pathKey(path: OpPath): string {
  return path
}

const STABLE_BRANCHES = {
  current: "main",
  local: [{ branch: "main", lastCommitDate: 0 }],
  remote: [] as string[],
  defaultBranch: "main",
  checkedOutBranches: {} as Record<string, string>,
}

const STABLE_OLLAMA_STATUS = {
  ollama: { available: false, models: [] as string[], recommendedModel: null as string | null },
  internet: { online: true, checked: 0 },
}

const QUERY_HANDLERS: Record<string, (input: unknown) => unknown> = {
  "claudeCode.hasExistingCliConfig": () => ({
    hasConfig: false,
    hasApiKey: false,
    baseUrl: null,
  }),
  "claudeCode.getIntegration": () => ({
    isConnected: false,
    account: null,
  }),
  "codex.getIntegration": () => ({
    state: "not_connected",
    isConnected: false,
    rawOutput: "",
    exitCode: 0,
  }),
  "projects.getLaunchDirectory": () => null,
  "projects.list": () => listProjects(),
  "projects.get": (input) => {
    const { id } = input as { id: string }
    return getProject(id) ?? null
  },
  "chats.list": (input) => listChats(input as { projectId?: string }),
  "chats.listArchived": (input) =>
    listArchivedChats(input as { projectId?: string }),
  "chats.get": (input) => {
    const { id } = input as { id: string }
    return getChat(id)
  },
  "chats.getPendingPlanApprovals": () => [],
  "chats.getFileStats": () => [],
  "chats.getPrStatus": () => null,
  "chats.getPrContext": () => null,
  "chats.getParsedDiff": () => ({ files: [] }),
  "claude.getAllMcpConfig": () => ({ servers: [] }),
  "codex.getAllMcpConfig": () => ({ servers: [] }),
  "cursor.getAllMcpConfig": () => ({ groups: [] }),
  "cursor.getMcpConfig": () => ({ groups: [], mcpServers: [] }),
  "agents.listEnabled": () => [],
  "skills.listEnabled": () => [],
  "commands.list": () => [],
  "files.search": () => [],
  "ollama.listModels": () => [],
  "ollama.getStatus": () => STABLE_OLLAMA_STATUS,
  "ollama.isOfflineModeAvailable": () => ({
    available: false,
    model: null,
  }),
  "ollama.getModels": () => ({
    available: false,
    models: [],
    recommendedModel: null,
  }),
  "voice.isAvailable": () => ({
    available: false,
    method: "local" as const,
    reason: "Voice is not available in the browser preview.",
  }),
  "cursor.getIntegration": () => ({
    state: "not_connected",
    isConnected: false,
    rawOutput: "",
    exitCode: 0,
  }),
  "cursor.getLoginSession": () => ({
    sessionId: "",
    state: "idle" as const,
    url: null,
    output: "",
    error: null,
  }),
  "worktreeConfig.get": () => ({
    config: null,
    path: null,
    source: null,
    available: [],
    projectPath: "",
  }),
  "agents.list": () => [],
  "changes.getStatus": () => ({
    branch: "main",
    defaultBranch: "main",
    againstBase: [],
    commits: [],
    staged: [],
    unstaged: [],
    untracked: [],
    ahead: 0,
    behind: 0,
  }),
  "changes.getBranches": () => STABLE_BRANCHES,
  "changes.getCommitFiles": () => [],
  "changes.getCommitFileDiff": () => ({ diff: "" }),
  "changes.getGitHubStatus": () => null,
}

type SubscriptionObserver = {
  next: (value: { result: { data: unknown } }) => void
  complete: () => void
}

const AGENT_WEB_PREVIEW_MESSAGE =
  "This is a browser preview — agent execution requires the desktop app. Your message was saved, but no AI response will be generated here."

const CURSOR_WEB_PREVIEW_MESSAGE =
  "Cursor CLI is only available in the desktop app. Download and run the Electron build to chat with Cursor."

function emitWebPreviewChatResponse(
  observer: SubscriptionObserver,
  message: string,
): void {
  const textId = "web-preview"
  queueMicrotask(() => {
    observer.next({ result: { data: { type: "start" } } })
    observer.next({ result: { data: { type: "text-start", id: textId } } })
    observer.next({
      result: { data: { type: "text-delta", id: textId, delta: message } },
    })
    observer.next({ result: { data: { type: "text-end", id: textId } } })
    observer.next({ result: { data: { type: "finish" } } })
    observer.complete()
  })
}

const SUBSCRIPTION_HANDLERS: Record<
  string,
  (input: unknown, observer: SubscriptionObserver) => void | (() => void)
> = {
  "claude.chat": (_input, observer) => {
    emitWebPreviewChatResponse(observer, AGENT_WEB_PREVIEW_MESSAGE)
  },
  "codex.chat": (_input, observer) => {
    emitWebPreviewChatResponse(observer, AGENT_WEB_PREVIEW_MESSAGE)
  },
  "cursor.chat": (_input, observer) => {
    emitWebPreviewChatResponse(observer, CURSOR_WEB_PREVIEW_MESSAGE)
  },
}

const MUTATION_HANDLERS: Record<string, (input: unknown) => unknown> = {
  "projects.openFolder": () => null,
  "projects.create": (input) => {
    const { path, name } = input as { path: string; name?: string }
    return createProject({ path, name })
  },
  "projects.cloneFromGitHub": () => {
    throw new Error("GitHub clone is not available in the browser preview.")
  },
  "chats.create": (input) => createChat(input as Parameters<typeof createChat>[0]),
  "external.openExternal": () => ({ success: true }),
  "cursor.cancel": () => ({ cancelled: false, ignoredStale: false }),
  "cursor.cleanup": () => ({ success: true }),
  "changes.fetchRemote": () => ({ success: true }),
  "cursor.startLogin": () => ({
    sessionId: "web-stub",
    url: null,
    state: "error" as const,
    output: "",
    error: "Cursor login is not available in the browser preview.",
  }),
  "cursor.cancelLogin": () => ({ success: true }),
}

function defaultQueryResult(path: OpPath): unknown {
  if (path.endsWith(".list") || path.includes("list")) return []
  if (path.includes("get") || path.includes("status")) return null
  return {}
}

function defaultMutationResult(): unknown {
  return { success: true }
}

/**
 * tRPC link that serves in-memory/localStorage data for web standalone mode.
 * Unhandled procedures return safe empty defaults instead of crashing the UI.
 */
export function createWebTrpcLink<
  TRouter extends AppRouter = AppRouter,
>(): TRPCLink<TRouter> {
  return () => {
    return ({ op }) => {
      return observable((observer) => {
        const key = pathKey(op.path)

        if (op.type === "subscription") {
          const handler = SUBSCRIPTION_HANDLERS[key]
          if (handler) {
            const cleanup = handler(op.input, observer)
            return cleanup
          }
          // Stay open — completing immediately causes tRPC to resubscribe in a loop.
          return () => {}
        }

        void (async () => {
          try {
            let result: unknown

            if (op.type === "query") {
              const handler = QUERY_HANDLERS[key]
              result = handler
                ? handler(op.input)
                : defaultQueryResult(key)
            } else if (op.type === "mutation") {
              const handler = MUTATION_HANDLERS[key]
              result = handler
                ? handler(op.input)
                : defaultMutationResult()
            } else {
              result = null
            }

            observer.next({ result: { data: result } })
            observer.complete()
          } catch (error) {
            observer.error(error as Error)
          }
        })()
      })
    }
  }
}
