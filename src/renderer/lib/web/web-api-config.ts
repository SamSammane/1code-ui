import { isAgentsWebStandalone } from "./web-runtime"

/**
 * Web API URL resolution (shared by tRPC links and platform helpers).
 */
export function getWebApiUrl(): string | null {
  if (!isAgentsWebStandalone()) return null

  const configured = import.meta.env.VITE_WEB_API_URL as string | undefined
  if (configured === "false" || configured === "0") return null
  if (configured && configured.length > 0) return configured

  // Dev default when vite.web.config enables the proxy (see WEB_STUB_ONLY)
  if (import.meta.env.DEV) return "/api"
  return null
}

export function isWebApiBackendEnabled(): boolean {
  return getWebApiUrl() !== null
}

/** Browser-only preview with localStorage stubs (no local API server). */
export function isWebStubMode(): boolean {
  return isAgentsWebStandalone() && getWebApiUrl() === null
}
