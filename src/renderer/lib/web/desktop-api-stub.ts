import type { DesktopApi } from "../../../preload/index.d"

function noopUnsub(): () => void {
  return () => {}
}

async function noop(): Promise<void> {}

async function noopNull<T>(): Promise<T | null> {
  return null
}

async function noopFalse(): Promise<boolean> {
  return false
}

async function noopZero(): Promise<number> {
  return 1
}

type ExtendedDesktopApi = DesktopApi & {
  signedFetch: (
    url: string,
    options?: { method?: string; body?: string; headers?: Record<string, string> },
  ) => Promise<{ ok: boolean; status: number; data: unknown; error: string | null }>
  setWindowTitle: (title: string) => Promise<void>
  getWindowFrameState: () => Promise<boolean>
  setWindowFramePreference: (useNativeFrame: boolean) => Promise<boolean>
  onShortcutOpenSettings: (callback: () => void) => () => void
  setBadgeIcon: (imageData: string | null) => Promise<void>
  getAuthToken: () => Promise<string | null>
  streamFetch: (
    streamId: string,
    url: string,
    options?: { method?: string; body?: string; headers?: Record<string, string> },
  ) => Promise<{ ok: boolean; status: number; error?: string }>
  onStreamChunk: (streamId: string, callback: (chunk: Uint8Array) => void) => () => void
  onStreamDone: (streamId: string, callback: () => void) => () => void
  onStreamError: (streamId: string, callback: (error: string) => void) => () => void
  onFileChanged: (
    callback: (data: { filePath: string; type: string; subChatId: string }) => void,
  ) => () => void
  onGitStatusChanged: (
    callback: (data: {
      worktreePath: string
      changes: Array<{ path: string; type: "add" | "change" | "unlink" }>
    }) => void,
  ) => () => void
  subscribeToGitWatcher: (worktreePath: string) => Promise<void>
  unsubscribeFromGitWatcher: (worktreePath: string) => Promise<void>
  scanVSCodeThemes: () => Promise<unknown[]>
  loadVSCodeTheme: (themePath: string) => Promise<unknown>
  saveFile: (options: {
    base64Data: string
    filename: string
    filters?: { name: string; extensions: string[] }[]
  }) => Promise<{ success: boolean; filePath?: string }>
  unlockDevTools: () => Promise<void>
  isPackaged: () => Promise<boolean>
}

/**
 * Browser implementation of `window.desktopApi`.
 * Provides safe no-ops for Electron-only APIs and web fallbacks where possible.
 */
export function createDesktopApiStub(): ExtendedDesktopApi {
  const apiBaseUrl =
    (import.meta.env.VITE_API_URL as string | undefined) ?? ""

  return {
    isElectron: false,

    platform: "unknown" as NodeJS.Platform,
    arch: "unknown",
    getVersion: async () => "web",
    isPackaged: async () => false,

    checkForUpdates: noopNull,
    downloadUpdate: noopFalse,
    installUpdate: () => {},
    onUpdateChecking: noopUnsub,
    onUpdateAvailable: noopUnsub,
    onUpdateNotAvailable: noopUnsub,
    onUpdateProgress: noopUnsub,
    onUpdateDownloaded: noopUnsub,
    onUpdateError: noopUnsub,
    onUpdateManualCheck: noopUnsub,

    windowMinimize: noop,
    windowMaximize: noop,
    windowClose: noop,
    windowIsMaximized: noopFalse,
    windowToggleFullscreen: noop,
    windowIsFullscreen: noopFalse,
    setTrafficLightVisibility: noop,
    setWindowFramePreference: noopFalse,
    getWindowFrameState: noopFalse,
    setWindowTitle: noop,
    onFullscreenChange: noopUnsub,
    onFocusChange: noopUnsub,

    zoomIn: noop,
    zoomOut: noop,
    zoomReset: noop,
    getZoom: noopZero,

    toggleDevTools: noop,
    unlockDevTools: noop,

    setAnalyticsOptOut: noop,

    setBadge: noop,
    setBadgeIcon: noop,
    showNotification: async (options) => {
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        new Notification(options.title, { body: options.body })
      }
    },
    openExternal: async (url) => {
      window.open(url, "_blank", "noopener,noreferrer")
    },
    getApiBaseUrl: async () => apiBaseUrl,

    clipboardWrite: async (text) => {
      await navigator.clipboard.writeText(text)
    },
    clipboardRead: async () => {
      return navigator.clipboard.readText()
    },
    saveFile: async () => ({ success: false }),

    getUser: noopNull,
    isAuthenticated: noopFalse,
    logout: noop,
    startAuthFlow: noop,
    submitAuthCode: noop,
    updateUser: noopNull,
    getAuthToken: noopNull,
    signedFetch: async () => ({
      ok: false,
      status: 0,
      data: null,
      error: "signedFetch is not available in the browser preview",
    }),
    streamFetch: async () => ({
      ok: false,
      status: 0,
      error: "streamFetch is not available in the browser preview",
    }),
    onStreamChunk: () => noopUnsub(),
    onStreamDone: () => noopUnsub(),
    onStreamError: () => noopUnsub(),
    onAuthSuccess: noopUnsub,
    onAuthError: noopUnsub,

    newWindow: async () => ({ blocked: true }),

    claimChat: async () => ({ ok: true as const }),
    releaseChat: noop,
    focusChatOwner: noopFalse,

    onShortcutNewAgent: noopUnsub,
    onShortcutOpenSettings: noopUnsub,
    onWorktreeSetupFailed: noopUnsub,
    onFileChanged: noopUnsub,
    onGitStatusChanged: noopUnsub,
    subscribeToGitWatcher: noop,
    unsubscribeFromGitWatcher: noop,
    scanVSCodeThemes: async () => [],
    loadVSCodeTheme: async () => ({}),
  }
}
