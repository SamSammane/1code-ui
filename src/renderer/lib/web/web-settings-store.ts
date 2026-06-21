/**
 * Browser-local Claude settings (mirrors ~/.claude/settings.json subset).
 */

const STORAGE_KEY = "web-claude-settings"

type ClaudeSettings = Record<string, unknown>

function load(): ClaudeSettings {
  if (typeof localStorage === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ClaudeSettings) : {}
  } catch {
    return {}
  }
}

function save(settings: ClaudeSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function getIncludeCoAuthoredBy(): boolean {
  const settings = load()
  return settings.includeCoAuthoredBy !== false
}

export function setIncludeCoAuthoredBy(enabled: boolean): { success: true } {
  const settings = load()
  if (enabled) {
    delete settings.includeCoAuthoredBy
  } else {
    settings.includeCoAuthoredBy = false
  }
  save(settings)
  return { success: true }
}

export function getEnabledPlugins(): string[] {
  const settings = load()
  return Array.isArray(settings.enabledPlugins)
    ? (settings.enabledPlugins as string[])
    : []
}

export function setPluginEnabled(input: {
  pluginSource: string
  enabled: boolean
}): { success: true } {
  const settings = load()
  const enabledPlugins = getEnabledPlugins()

  if (input.enabled && !enabledPlugins.includes(input.pluginSource)) {
    enabledPlugins.push(input.pluginSource)
  } else if (!input.enabled) {
    const index = enabledPlugins.indexOf(input.pluginSource)
    if (index > -1) enabledPlugins.splice(index, 1)
  }

  settings.enabledPlugins = enabledPlugins
  save(settings)
  return { success: true }
}

export function getApprovedPluginMcpServers(): string[] {
  const settings = load()
  return Array.isArray(settings.approvedPluginMcpServers)
    ? (settings.approvedPluginMcpServers as string[])
    : []
}

export function approvePluginMcpServer(input: {
  identifier: string
}): { success: true } {
  const settings = load()
  const approved = getApprovedPluginMcpServers()
  if (!approved.includes(input.identifier)) {
    approved.push(input.identifier)
  }
  settings.approvedPluginMcpServers = approved
  save(settings)
  return { success: true }
}

export function revokePluginMcpServer(input: {
  identifier: string
}): { success: true } {
  const settings = load()
  const approved = getApprovedPluginMcpServers().filter(
    (id) => id !== input.identifier,
  )
  settings.approvedPluginMcpServers = approved
  save(settings)
  return { success: true }
}

export function approveAllPluginMcpServers(input: {
  pluginSource: string
  serverNames: string[]
}): { success: true } {
  const settings = load()
  const approved = getApprovedPluginMcpServers()
  for (const serverName of input.serverNames) {
    const identifier = `${input.pluginSource}:${serverName}`
    if (!approved.includes(identifier)) approved.push(identifier)
  }
  settings.approvedPluginMcpServers = approved
  save(settings)
  return { success: true }
}

export function revokeAllPluginMcpServers(input: {
  pluginSource: string
}): { success: true } {
  const settings = load()
  const prefix = `${input.pluginSource}:`
  settings.approvedPluginMcpServers = getApprovedPluginMcpServers().filter(
    (id) => !id.startsWith(prefix),
  )
  save(settings)
  return { success: true }
}
