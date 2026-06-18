import React from "react"

interface WebErrorBoundaryProps {
  children: React.ReactNode
}

interface WebErrorBoundaryState {
  error: Error | null
}

export class WebErrorBoundary extends React.Component<
  WebErrorBoundaryProps,
  WebErrorBoundaryState
> {
  state: WebErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): WebErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[WebErrorBoundary]", error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-screen w-screen overflow-auto bg-background p-6 text-sm text-foreground">
          <h1 className="mb-2 text-base font-semibold">
            Browser preview crashed
          </h1>
          <p className="mb-4 text-muted-foreground">
            Agent execution requires the desktop app. This error helps debug the
            web UI shell.
          </p>
          <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-4 text-xs">
            {this.state.error.stack ?? this.state.error.message}
          </pre>
        </div>
      )
    }

    return this.props.children
  }
}
