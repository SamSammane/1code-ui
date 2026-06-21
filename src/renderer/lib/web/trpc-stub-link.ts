import type { TRPCLink } from "@trpc/client"
import { observable } from "@trpc/server/observable"
import type { AppRouter } from "../../../main/lib/trpc/routers"
import {
  archiveChat,
  archiveChatsBatch,
  createChat,
  createProject,
  createSubChat,
  deleteSubChat,
  exportChat,
  forkSubChat,
  generateSubChatName,
  getChat,
  getFileStats,
  getPendingPlanApprovals,
  getProject,
  getSubChat,
  listArchivedChats,
  listChats,
  listProjects,
  renameChat,
  renameSubChat,
  restoreChat,
  rollbackToMessage,
  updateSubChatMessages,
  updateSubChatMode,
  updateSubChatSession,
} from "./web-store"
import * as webSettings from "./web-settings-store"
import {
  readVirtualText,
  writePastedText as writeVirtualPastedText,
} from "./web-file-store"

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

const STABLE_GIT_STATUS = {
  branch: "main",
  defaultBranch: "main",
  againstBase: [] as string[],
  commits: [] as unknown[],
  staged: [] as unknown[],
  unstaged: [] as unknown[],
  untracked: [] as unknown[],
  ahead: 0,
  behind: 0,
  hasUpstream: false,
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
  "chats.getSubChat": (input) => {
    const { id } = input as { id: string }
    return getSubChat(id)
  },
  "chats.getPendingPlanApprovals": (input) =>
    getPendingPlanApprovals(input as { openSubChatIds: string[] }),
  "chats.pollWorktreeSetupFailures": () => [],
  "chats.getFileStats": (input) =>
    getFileStats(
      input as { openSubChatIds?: string[]; chatIds?: string[] },
    ),
  "chats.getPrStatus": () => null,
  "chats.getPrContext": () => null,
  "chats.getParsedDiff": () => ({
    files: [],
    fileContents: {},
    totalAdditions: 0,
    totalDeletions: 0,
  }),
  "chats.getDiff": () => ({ diff: "", files: [] }),
  "chats.exportChat": (input) =>
    exportChat(
      input as {
        chatId: string
        subChatId?: string
        format: "json" | "markdown" | "text"
      },
    ),
  "chats.getWorktreeStatus": () => ({ exists: false, path: null }),
  "claude.getAllMcpConfig": () => ({ servers: [] }),
  "codex.getAllMcpConfig": () => ({ servers: [] }),
  "cursor.getAllMcpConfig": () => ({ groups: [] }),
  "cursor.getMcpConfig": () => ({ groups: [], mcpServers: [] }),
  "agents.listEnabled": () => [],
  "skills.listEnabled": () => [],
  "commands.list": () => [],
  "commands.getContent": () => ({ content: "" }),
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
  "changes.getStatus": () => STABLE_GIT_STATUS,
  "changes.getBranches": () => STABLE_BRANCHES,
  "changes.getCommitFiles": () => [],
  "changes.getCommitFileDiff": () => ({ diff: "" }),
  "changes.getGitHubStatus": () => null,
  "changes.getHistory": () => [],
  "changes.isWorktreeRegistered": () => false,
  "changes.getRepositoryState": () => ({ state: "clean" as const }),
  "claudeSettings.getIncludeCoAuthoredBy": () =>
    webSettings.getIncludeCoAuthoredBy(),
  "claudeSettings.getEnabledPlugins": () => webSettings.getEnabledPlugins(),
  "claudeSettings.getApprovedPluginMcpServers": () =>
    webSettings.getApprovedPluginMcpServers(),
  "files.readTextFile": (input) => {
    const { path } = input as { path: string }
    const virtual = readVirtualText(path)
    if (virtual !== null) return { content: virtual, path }
    return { content: "", path }
  },
  "files.readFile": (input) => {
    const { path } = input as { path: string }
    const virtual = readVirtualText(path)
    return { content: virtual ?? "", path }
  },
  "files.readBinaryFile": () => ({
    ok: false as const,
    error: "Binary files require the local API server or desktop app.",
  }),
  "worktreeConfig.list": () => [],
  "changes.getFileContents": () => ({ content: "" }),
  "changes.readWorkingFile": () => ({
    ok: true as const,
    content: "",
    truncated: false,
    byteLength: 0,
  }),
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
  "chats.create": (input) =>
    createChat(input as Parameters<typeof createChat>[0]),
  "chats.rename": (input) => renameChat(input as { id: string; name: string }),
  "chats.archive": (input) =>
    archiveChat(input as { id: string; deleteWorktree?: boolean }),
  "chats.restore": (input) => restoreChat(input as { id: string }),
  "chats.archiveBatch": (input) =>
    archiveChatsBatch(input as { ids: string[] }),
  "chats.createSubChat": (input) =>
    createSubChat(
      input as {
        chatId: string
        name?: string
        mode?: "plan" | "agent"
      },
    ),
  "chats.forkSubChat": (input) =>
    forkSubChat(
      input as {
        subChatId: string
        messageId: string
        messageIndex?: number
        name?: string
      },
    ),
  "chats.updateSubChatMessages": (input) =>
    updateSubChatMessages(input as { id: string; messages: string }),
  "chats.updateSubChatSession": (input) =>
    updateSubChatSession(
      input as { id: string; sessionId: string | null },
    ),
  "chats.updateSubChatMode": (input) =>
    updateSubChatMode(input as { id: string; mode: "plan" | "agent" }),
  "chats.renameSubChat": (input) =>
    renameSubChat(input as { id: string; name: string }),
  "chats.deleteSubChat": (input) => deleteSubChat(input as { id: string }),
  "chats.rollbackToMessage": (input) =>
    rollbackToMessage(
      input as { subChatId: string; sdkMessageUuid: string },
    ),
  "chats.generateSubChatName": (input) =>
    generateSubChatName(input as { userMessage: string }),
  "chats.generateCommitMessage": () => ({
    message: "Update project files",
  }),
  "chats.updatePrInfo": () => ({ success: true }),
  "chats.mergePr": () => ({ success: false, error: "PR merge is not available in the browser preview." }),
  "files.writePastedText": (input) =>
    writeVirtualPastedText(
      input as { subChatId: string; text: string; filename?: string },
    ),
  "claudeSettings.setIncludeCoAuthoredBy": (input) =>
    webSettings.setIncludeCoAuthoredBy(
      (input as { enabled: boolean }).enabled,
    ),
  "claudeSettings.setPluginEnabled": (input) =>
    webSettings.setPluginEnabled(
      input as { pluginSource: string; enabled: boolean },
    ),
  "claudeSettings.approvePluginMcpServer": (input) =>
    webSettings.approvePluginMcpServer(input as { identifier: string }),
  "claudeSettings.revokePluginMcpServer": (input) =>
    webSettings.revokePluginMcpServer(input as { identifier: string }),
  "claudeSettings.approveAllPluginMcpServers": (input) =>
    webSettings.approveAllPluginMcpServers(
      input as { pluginSource: string; serverNames: string[] },
    ),
  "claudeSettings.revokeAllPluginMcpServers": (input) =>
    webSettings.revokeAllPluginMcpServers(
      input as { pluginSource: string },
    ),
  "changes.stageFile": () => ({ success: true }),
  "changes.unstageFile": () => ({ success: true }),
  "changes.discardChanges": () => ({ success: true }),
  "changes.stageAll": () => ({ success: true }),
  "changes.unstageAll": () => ({ success: true }),
  "changes.stageFiles": () => ({ success: true }),
  "changes.unstageFiles": () => ({ success: true }),
  "changes.deleteUntracked": () => ({ success: true }),
  "changes.discardMultipleChanges": () => ({ success: true }),
  "changes.deleteMultipleUntracked": () => ({ success: true }),
  "changes.commit": () => ({ success: true, commitHash: "web-stub" }),
  "changes.atomicCommit": () => ({ success: true, commitHash: "web-stub" }),
  "changes.push": () => ({ success: false, error: "Git push requires the local API server." }),
  "changes.pull": () => ({ success: false, error: "Git pull requires the local API server." }),
  "changes.fetch": () => ({ success: true }),
  "changes.checkout": () => ({ success: true }),
  "changes.forcePush": () => ({ success: false }),
  "changes.mergeFromDefault": () => ({ success: false }),
  "changes.createPR": () => ({ success: false }),
  "changes.switchBranch": () => ({ success: true }),
  "changes.createBranch": () => ({ success: true }),
  "changes.saveFile": () => ({ success: true }),
  "claude.respondToolApproval": () => ({ success: true }),
  "claude.cancel": () => ({ cancelled: true }),
  "codex.cancel": () => ({ cancelled: false, ignoredStale: false }),
  "codex.cleanup": () => ({ success: true }),
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
