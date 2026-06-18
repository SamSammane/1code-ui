import { isWebStandalone } from "../lib/utils/platform"

export function WebModeBanner() {
  if (!isWebStandalone()) return null

  return (
    <div className="shrink-0 border-b border-border bg-muted/40 px-3 py-1.5 text-center text-xs text-muted-foreground">
      Browser preview — agent execution and local filesystem features require the
      desktop app.
    </div>
  )
}
