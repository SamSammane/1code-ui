/**
 * Vite alias target for `trpc-electron/renderer` in web builds.
 * The real ipcLink is never used when `isWebStandalone()` is true.
 */
export function ipcLink(): never {
  throw new Error("ipcLink is not available in web standalone mode")
}
