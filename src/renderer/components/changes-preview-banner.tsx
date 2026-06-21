import { isWebApiBackendEnabled } from "../lib/trpc-links"
import { isWebStandalone } from "../lib/utils/platform"

export function ChangesPreviewBanner() {
  if (!isWebStandalone() || isWebApiBackendEnabled()) return null

  return (
    <div className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-900 dark:text-amber-200">
      Git changes are read-only in browser stub mode. Run{" "}
      <code className="rounded bg-muted px-1 py-0.5">bun run dev:web</code> with
      the local API server for real git status, or use the desktop app.
    </div>
  )
}
