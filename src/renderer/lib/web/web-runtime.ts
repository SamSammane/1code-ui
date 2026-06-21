declare global {
  interface Window {
    /** Set by `installWebRuntime()` before React boots. */
    __AGENTS_WEB_STANDALONE__?: boolean
    electronTRPC?: unknown
  }
}

export function hasElectronTrpc(): boolean {
  return typeof globalThis !== "undefined" && Boolean(globalThis.electronTRPC)
}

/** Browser build (`vite.web.config`) or `installWebRuntime()` entry. */
export function isAgentsWebStandalone(): boolean {
  if (import.meta.env.VITE_WEB_STANDALONE === "true") return true
  if (typeof window !== "undefined" && window.__AGENTS_WEB_STANDALONE__ === true) {
    return true
  }
  return false
}

/** Use HTTP or localStorage tRPC instead of Electron IPC. */
export function shouldUseWebTrpcLinks(): boolean {
  return isAgentsWebStandalone() || !hasElectronTrpc()
}
