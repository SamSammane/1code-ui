/**
 * In-browser persistence for web standalone mode (localStorage).
 * Mirrors a subset of the SQLite schema used by the desktop app.
 */

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
