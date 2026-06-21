/**
 * In-browser persistence for web standalone mode (localStorage).
 * Mirrors a subset of the SQLite schema used by the desktop app.
 */

import { writePastedText as writeVirtualPastedText } from "./web-file-store"

export interface WebProject {
  id: string
  name: string
  path: string
  createdAt: Date
  updatedAt: Date
  gitRemoteUrl: string | null
  gitProvider: string | null
  gitOwner: string | null
  gitRepo: string | null
  iconPath: string | null
}

export interface WebChat {
  id: string
  name: string | null
  projectId: string
  createdAt: Date
  updatedAt: Date
  archivedAt: Date | null
  worktreePath: string | null
  branch: string | null
  baseBranch: string | null
}

export interface WebSubChat {
  id: string
  chatId: string
  name: string | null
  mode: "plan" | "agent"
  messages: string
  sessionId: string | null
  createdAt: Date
  updatedAt: Date
}

interface WebDb {
  projects: WebProject[]
  chats: WebChat[]
  subChats: WebSubChat[]
}

const STORAGE_KEY = "web-agents-db"

function createId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 10)
  return `${timestamp}${randomPart}`
}

function parseDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value === "string" || typeof value === "number") {
    return new Date(value)
  }
  return new Date()
}

function loadDb(): WebDb {
  if (typeof localStorage === "undefined") {
    return { projects: [], chats: [], subChats: [] }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { projects: [], chats: [], subChats: [] }
    const parsed = JSON.parse(raw) as {
      projects?: Array<Record<string, unknown>>
      chats?: Array<Record<string, unknown>>
      subChats?: Array<Record<string, unknown>>
    }
    return {
      projects: (parsed.projects ?? []).map((p) => ({
        id: String(p.id),
        name: String(p.name),
        path: String(p.path),
        createdAt: parseDate(p.createdAt),
        updatedAt: parseDate(p.updatedAt),
        gitRemoteUrl: (p.gitRemoteUrl as string | null) ?? null,
        gitProvider: (p.gitProvider as string | null) ?? null,
        gitOwner: (p.gitOwner as string | null) ?? null,
        gitRepo: (p.gitRepo as string | null) ?? null,
        iconPath: (p.iconPath as string | null) ?? null,
      })),
      chats: (parsed.chats ?? []).map((c) => ({
        id: String(c.id),
        name: (c.name as string | null) ?? null,
        projectId: String(c.projectId),
        createdAt: parseDate(c.createdAt),
        updatedAt: parseDate(c.updatedAt),
        archivedAt: c.archivedAt ? parseDate(c.archivedAt) : null,
        worktreePath: (c.worktreePath as string | null) ?? null,
        branch: (c.branch as string | null) ?? null,
        baseBranch: (c.baseBranch as string | null) ?? null,
      })),
      subChats: (parsed.subChats ?? []).map((sc) => ({
        id: String(sc.id),
        chatId: String(sc.chatId),
        name: (sc.name as string | null) ?? null,
        mode: (sc.mode === "plan" ? "plan" : "agent") as "plan" | "agent",
        messages: typeof sc.messages === "string" ? sc.messages : "[]",
        sessionId: (sc.sessionId as string | null) ?? null,
        createdAt: parseDate(sc.createdAt),
        updatedAt: parseDate(sc.updatedAt),
      })),
    }
  } catch {
    return { projects: [], chats: [], subChats: [] }
  }
}

function saveDb(db: WebDb): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

function basename(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "")
  const parts = normalized.split("/")
  return parts[parts.length - 1] || path
}

export function listProjects(): WebProject[] {
  return [...loadDb().projects].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  )
}

export function getProject(id: string): WebProject | undefined {
  return loadDb().projects.find((p) => p.id === id)
}

export function createProject(input: {
  path: string
  name?: string
}): WebProject {
  const db = loadDb()
  const existing = db.projects.find((p) => p.path === input.path)
  if (existing) {
    existing.updatedAt = new Date()
    saveDb(db)
    return existing
  }

  const now = new Date()
  const project: WebProject = {
    id: createId(),
    name: input.name?.trim() || basename(input.path),
    path: input.path,
    createdAt: now,
    updatedAt: now,
    gitRemoteUrl: null,
    gitProvider: null,
    gitOwner: null,
    gitRepo: null,
    iconPath: null,
  }
  db.projects.unshift(project)
  saveDb(db)
  return project
}

export function listChats(input?: { projectId?: string }): WebChat[] {
  const chats = loadDb().chats.filter((c) => !c.archivedAt)
  const filtered = input?.projectId
    ? chats.filter((c) => c.projectId === input.projectId)
    : chats
  return [...filtered].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  )
}

export function listArchivedChats(input?: { projectId?: string }): WebChat[] {
  const chats = loadDb().chats.filter((c) => !!c.archivedAt)
  const filtered = input?.projectId
    ? chats.filter((c) => c.projectId === input.projectId)
    : chats
  return [...filtered].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  )
}

type MessagePart =
  | { type: "text"; text: string }
  | { type: "data-image"; data: Record<string, unknown> }
  | { type: "file-content"; filePath: string; content: string }

function buildInitialMessages(input: {
  model?: string
  initialMessageParts?: MessagePart[]
  initialMessage?: string
}): string {
  const metadata = input.model ? { model: input.model } : undefined

  if (input.initialMessageParts && input.initialMessageParts.length > 0) {
    return JSON.stringify([
      {
        id: `msg-${Date.now()}`,
        role: "user",
        parts: input.initialMessageParts,
        ...(metadata ? { metadata } : {}),
      },
    ])
  }

  if (input.initialMessage) {
    return JSON.stringify([
      {
        id: `msg-${Date.now()}`,
        role: "user",
        parts: [{ type: "text", text: input.initialMessage }],
        ...(metadata ? { metadata } : {}),
      },
    ])
  }

  return "[]"
}

export function getChat(id: string): (WebChat & {
  subChats: WebSubChat[]
  project: WebProject | null
}) | null {
  const db = loadDb()
  const chat = db.chats.find((c) => c.id === id)
  if (!chat) return null

  const subChats = db.subChats
    .filter((sc) => sc.chatId === id)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  return {
    ...chat,
    subChats,
    project: db.projects.find((p) => p.id === chat.projectId) ?? null,
  }
}

export function createChat(input: {
  projectId: string
  name?: string
  mode?: "plan" | "agent"
  model?: string
  initialMessageParts?: MessagePart[]
  initialMessage?: string
  useWorktree?: boolean
}): WebChat & { worktreePath: string; subChats: WebSubChat[] } {
  const db = loadDb()
  const project = db.projects.find((p) => p.id === input.projectId)
  if (!project) {
    throw new Error("Project not found")
  }

  const now = new Date()
  const chat: WebChat = {
    id: createId(),
    name: input.name ?? null,
    projectId: input.projectId,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    worktreePath: project.path,
    branch: null,
    baseBranch: null,
  }

  const subChat: WebSubChat = {
    id: createId(),
    chatId: chat.id,
    name: null,
    mode: input.mode ?? "agent",
    messages: buildInitialMessages(input),
    sessionId: null,
    createdAt: now,
    updatedAt: now,
  }

  db.chats.unshift(chat)
  db.subChats.push(subChat)
  saveDb(db)

  return {
    ...chat,
    worktreePath: project.path,
    subChats: [subChat],
  }
}

function touchChat(db: WebDb, chatId: string): void {
  const chat = db.chats.find((c) => c.id === chatId)
  if (chat) chat.updatedAt = new Date()
}

function getSubChatOrThrow(db: WebDb, id: string): WebSubChat {
  const subChat = db.subChats.find((sc) => sc.id === id)
  if (!subChat) throw new Error("Sub-chat not found")
  return subChat
}

export function renameChat(input: { id: string; name: string }): WebChat {
  const db = loadDb()
  const chat = db.chats.find((c) => c.id === input.id)
  if (!chat) throw new Error("Chat not found")
  chat.name = input.name
  chat.updatedAt = new Date()
  saveDb(db)
  return chat
}

export function archiveChat(input: {
  id: string
  deleteWorktree?: boolean
}): WebChat {
  const db = loadDb()
  const chat = db.chats.find((c) => c.id === input.id)
  if (!chat) throw new Error("Chat not found")
  chat.archivedAt = new Date()
  chat.updatedAt = new Date()
  if (input.deleteWorktree) {
    chat.worktreePath = null
    chat.branch = null
    chat.baseBranch = null
  }
  saveDb(db)
  return chat
}

export function restoreChat(input: { id: string }): WebChat {
  const db = loadDb()
  const chat = db.chats.find((c) => c.id === input.id)
  if (!chat) throw new Error("Chat not found")
  chat.archivedAt = null
  chat.updatedAt = new Date()
  saveDb(db)
  return chat
}

export function archiveChatsBatch(input: { ids: string[] }): WebChat[] {
  const db = loadDb()
  const archived: WebChat[] = []
  for (const id of input.ids) {
    const chat = db.chats.find((c) => c.id === id)
    if (!chat) continue
    chat.archivedAt = new Date()
    chat.updatedAt = new Date()
    archived.push(chat)
  }
  saveDb(db)
  return archived
}

export function getSubChat(id: string): (WebSubChat & {
  chat: (WebChat & { project: WebProject | null }) | null
}) | null {
  const db = loadDb()
  const subChat = db.subChats.find((sc) => sc.id === id)
  if (!subChat) return null
  const chat = db.chats.find((c) => c.id === subChat.chatId)
  return {
    ...subChat,
    chat: chat
      ? {
          ...chat,
          project: db.projects.find((p) => p.id === chat.projectId) ?? null,
        }
      : null,
  }
}

export function createSubChat(input: {
  chatId: string
  name?: string
  mode?: "plan" | "agent"
}): WebSubChat {
  const db = loadDb()
  const chat = db.chats.find((c) => c.id === input.chatId)
  if (!chat) throw new Error("Chat not found")

  const now = new Date()
  const subChat: WebSubChat = {
    id: createId(),
    chatId: input.chatId,
    name: input.name ?? null,
    mode: input.mode ?? "agent",
    messages: "[]",
    sessionId: null,
    createdAt: now,
    updatedAt: now,
  }
  db.subChats.push(subChat)
  touchChat(db, input.chatId)
  saveDb(db)
  return subChat
}

export function updateSubChatMessages(input: {
  id: string
  messages: string
}): WebSubChat {
  const db = loadDb()
  const subChat = getSubChatOrThrow(db, input.id)
  subChat.messages = input.messages
  subChat.updatedAt = new Date()
  touchChat(db, subChat.chatId)
  saveDb(db)
  return subChat
}

export function updateSubChatSession(input: {
  id: string
  sessionId: string | null
}): WebSubChat {
  const db = loadDb()
  const subChat = getSubChatOrThrow(db, input.id)
  subChat.sessionId = input.sessionId
  subChat.updatedAt = new Date()
  saveDb(db)
  return subChat
}

export function updateSubChatMode(input: {
  id: string
  mode: "plan" | "agent"
}): WebSubChat {
  const db = loadDb()
  const subChat = getSubChatOrThrow(db, input.id)
  subChat.mode = input.mode
  subChat.updatedAt = new Date()
  saveDb(db)
  return subChat
}

export function renameSubChat(input: {
  id: string
  name: string
}): WebSubChat {
  const db = loadDb()
  const subChat = getSubChatOrThrow(db, input.id)
  subChat.name = input.name
  subChat.updatedAt = new Date()
  saveDb(db)
  return subChat
}

export function deleteSubChat(input: { id: string }): { success: true } {
  const db = loadDb()
  const index = db.subChats.findIndex((sc) => sc.id === input.id)
  if (index === -1) throw new Error("Sub-chat not found")
  db.subChats.splice(index, 1)
  saveDb(db)
  return { success: true }
}

export function forkSubChat(input: {
  subChatId: string
  messageId: string
  messageIndex?: number
  name?: string
}): {
  subChat: WebSubChat
  messageCount: number
  forkAtSdkUuid: string | null
} {
  const db = loadDb()
  const source = getSubChatOrThrow(db, input.subChatId)
  const allMessages = JSON.parse(source.messages || "[]") as Array<{
    id: string
    role: string
    metadata?: { sdkMessageUuid?: string; shouldResume?: boolean }
  }>

  let cutoffIndex = allMessages.findIndex((m) => m.id === input.messageId)
  if (
    cutoffIndex === -1 &&
    input.messageIndex !== undefined &&
    input.messageIndex < allMessages.length
  ) {
    cutoffIndex = input.messageIndex
  }
  if (cutoffIndex === -1) throw new Error("Message not found")

  const messagesToFork = allMessages.slice(0, cutoffIndex + 1)
  const lastAssistant = [...messagesToFork]
    .reverse()
    .find((m) => m.role === "assistant")
  const forkAtSdkUuid = lastAssistant?.metadata?.sdkMessageUuid ?? null

  const forkedMessages = messagesToFork.map((msg, i) => ({
    ...msg,
    id: `fork-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
    metadata: {
      ...msg.metadata,
      shouldResume: undefined,
      ...(msg === lastAssistant &&
        forkAtSdkUuid && { shouldForkResume: true }),
    },
  }))

  const baseName = source.name || "Chat"
  const forkCount =
    db.subChats.filter(
      (sc) => sc.chatId === source.chatId && sc.name?.startsWith("["),
    ).length + 1

  const now = new Date()
  const newSubChat: WebSubChat = {
    id: createId(),
    chatId: source.chatId,
    name: input.name ?? `[${forkCount}] ${baseName}`,
    mode: source.mode,
    messages: JSON.stringify(forkedMessages),
    sessionId: null,
    createdAt: now,
    updatedAt: now,
  }

  db.subChats.push(newSubChat)
  touchChat(db, source.chatId)
  saveDb(db)

  return {
    subChat: newSubChat,
    messageCount: forkedMessages.length,
    forkAtSdkUuid,
  }
}

export function rollbackToMessage(input: {
  subChatId: string
  sdkMessageUuid: string
}):
  | { success: false; error: string }
  | { success: true; messages: unknown[] } {
  const db = loadDb()
  const subChat = db.subChats.find((sc) => sc.id === input.subChatId)
  if (!subChat) return { success: false, error: "Sub-chat not found" }

  const messages = JSON.parse(subChat.messages || "[]") as Array<{
    metadata?: { sdkMessageUuid?: string; shouldResume?: boolean }
  }>
  const targetIndex = messages.findIndex(
    (m) => m.metadata?.sdkMessageUuid === input.sdkMessageUuid,
  )
  if (targetIndex === -1) {
    return { success: false, error: "Message not found" }
  }

  let truncatedMessages = messages.slice(0, targetIndex + 1).map((m, i, arr) => {
    const { shouldResume, ...restMeta } = m.metadata || {}
    return {
      ...m,
      metadata: {
        ...restMeta,
        ...(i === arr.length - 1 && { shouldResume: true }),
      },
    }
  })

  subChat.messages = JSON.stringify(truncatedMessages)
  subChat.updatedAt = new Date()
  touchChat(db, subChat.chatId)
  saveDb(db)

  return { success: true, messages: truncatedMessages }
}

export function generateSubChatName(input: {
  userMessage: string
}): { name: string } {
  const trimmed = input.userMessage.trim().replace(/\s+/g, " ")
  if (!trimmed) return { name: "New Chat" }
  const name = trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed
  return { name }
}

type MessageRow = {
  role: string
  parts?: Array<{
    type: string
    text?: string
    input?: {
      file_path?: string
      old_string?: string
      new_string?: string
      content?: string
    }
    output?: unknown
  }>
}

export function getFileStats(input: {
  openSubChatIds?: string[]
  chatIds?: string[]
}): Array<{
  chatId: string
  additions: number
  deletions: number
  fileCount: number
}> {
  const db = loadDb()
  if (
    (!input.openSubChatIds || input.openSubChatIds.length === 0) &&
    (!input.chatIds || input.chatIds.length === 0)
  ) {
    return []
  }

  const rows =
    input.chatIds && input.chatIds.length > 0
      ? db.subChats.filter((sc) => input.chatIds!.includes(sc.chatId))
      : db.subChats.filter((sc) => input.openSubChatIds!.includes(sc.id))

  const statsMap = new Map<
    string,
    { additions: number; deletions: number; fileCount: number }
  >()

  for (const row of rows) {
    if (!row.messages) continue
    try {
      const messages = JSON.parse(row.messages) as MessageRow[]
      const fileStates = new Map<
        string,
        { originalContent: string | null; currentContent: string }
      >()

      for (const msg of messages) {
        if (msg.role !== "assistant") continue
        for (const part of msg.parts || []) {
          if (part.type !== "tool-Edit" && part.type !== "tool-Write") continue
          const filePath = part.input?.file_path
          if (!filePath) continue
          const oldString = part.input?.old_string || ""
          const newString =
            part.input?.new_string || part.input?.content || ""
          const existing = fileStates.get(filePath)
          if (existing) {
            existing.currentContent = newString
          } else {
            fileStates.set(filePath, {
              originalContent: part.type === "tool-Write" ? null : oldString,
              currentContent: newString,
            })
          }
        }
      }

      let subChatAdditions = 0
      let subChatDeletions = 0
      let subChatFileCount = 0
      for (const state of fileStates.values()) {
        const original = state.originalContent ?? ""
        const current = state.currentContent
        const origLines = original.split("\n")
        const currLines = current.split("\n")
        subChatAdditions += Math.max(0, currLines.length - origLines.length)
        subChatDeletions += Math.max(0, origLines.length - currLines.length)
        subChatFileCount += 1
      }

      const existing = statsMap.get(row.chatId) || {
        additions: 0,
        deletions: 0,
        fileCount: 0,
      }
      existing.additions += subChatAdditions
      existing.deletions += subChatDeletions
      existing.fileCount += subChatFileCount
      statsMap.set(row.chatId, existing)
    } catch {
      // skip invalid JSON
    }
  }

  return Array.from(statsMap.entries()).map(([chatId, stats]) => ({
    chatId,
    ...stats,
  }))
}

export function getPendingPlanApprovals(input: {
  openSubChatIds: string[]
}): Array<{ subChatId: string; chatId: string }> {
  if (input.openSubChatIds.length === 0) return []

  const db = loadDb()
  const pending: Array<{ subChatId: string; chatId: string }> = []

  for (const row of db.subChats.filter((sc) =>
    input.openSubChatIds.includes(sc.id),
  )) {
    if (row.mode === "agent" || !row.messages) continue
    try {
      const messages = JSON.parse(row.messages) as MessageRow[]
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i]
        if (msg.role !== "assistant" || !msg.parts) continue
        const exitPlanPart = msg.parts.find(
          (p) => p.type === "tool-ExitPlanMode",
        )
        if (exitPlanPart && exitPlanPart.output !== undefined) {
          pending.push({ subChatId: row.id, chatId: row.chatId })
          break
        }
      }
    } catch {
      // skip
    }
  }

  return pending
}

export function exportChat(input: {
  chatId: string
  subChatId?: string
  format: "json" | "markdown" | "text"
}): { content: string; filename: string } {
  const chatData = getChat(input.chatId)
  if (!chatData) throw new Error("Chat not found")

  const subChats = input.subChatId
    ? chatData.subChats.filter((sc) => sc.id === input.subChatId)
    : chatData.subChats

  if (input.subChatId && subChats.length === 0) {
    throw new Error("Sub-chat not found")
  }

  const slug = (chatData.name || "chat")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50)

  if (input.format === "json") {
    const payload = subChats.map((sc) => ({
      id: sc.id,
      name: sc.name,
      mode: sc.mode,
      messages: JSON.parse(sc.messages || "[]"),
    }))
    return {
      content: JSON.stringify(
        { chat: chatData, subChats: payload },
        null,
        2,
      ),
      filename: `${slug}.json`,
    }
  }

  const lines: string[] = []
  for (const sc of subChats) {
    if (sc.name) lines.push(`## ${sc.name}`, "")
    const messages = JSON.parse(sc.messages || "[]") as MessageRow[]
    for (const msg of messages) {
      const role = msg.role === "user" ? "You" : "Assistant"
      const text =
        msg.parts
          ?.filter((p) => p.type === "text" && p.text)
          .map((p) => p.text)
          .join("\n") || ""
      if (text) {
        lines.push(`**${role}:**`, text, "")
      }
    }
  }

  const ext = input.format === "markdown" ? "md" : "txt"
  return {
    content: lines.join("\n").trim() || "(empty chat)",
    filename: `${slug}.${ext}`,
  }
}

export function writePastedText(input: {
  subChatId: string
  text: string
  filename?: string
}): { filePath: string; filename: string; size: number } {
  return writeVirtualPastedText(input)
}
