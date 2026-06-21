import { isWebApiBackendEnabled } from "../lib/trpc-links"
import { isWebStandalone } from "../lib/utils/platform"

export function WebModeBanner() {
  if (!isWebStandalone()) return null

  const apiConnected = isWebApiBackendEnabled()

  return (
    <div className="shrink-0 border-b border-border bg-muted/40 px-3 py-1.5 text-center text-xs text-muted-foreground">
      {apiConnected ? (
        <>
          Web mode — agents, git, and filesystem run on your machine via the local
          API server (<code className="rounded bg-muted px-1">bun run dev:web</code>
          ). Use absolute paths when adding projects.
        </>
      ) : (
        <>
          Browser stub mode — limited localStorage preview. Start{" "}
          <code className="rounded bg-muted px-1">bun run dev:web</code> for full
          parity, or use the desktop app.
        </>
      )}
    </div>
  )
}
