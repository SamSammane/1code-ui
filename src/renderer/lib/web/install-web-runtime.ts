import { createDesktopApiStub } from "./desktop-api-stub"

declare global {
  interface Window {
    webUtils?: {
      getPathForFile: (file: File) => string
    }
  }
}

/**
 * Install browser stubs before React boots (`main-web.tsx`).
 */
export function installWebRuntime(): void {
  if (typeof window === "undefined") return

  const existing = window.desktopApi as (typeof window.desktopApi & {
    isElectron?: boolean
  }) | undefined

  if (existing?.isElectron === true) return

  window.__AGENTS_WEB_STANDALONE__ = true
  window.desktopApi = createDesktopApiStub()

  if (!window.webUtils) {
    window.webUtils = {
      getPathForFile: () => "",
    }
  }
}
