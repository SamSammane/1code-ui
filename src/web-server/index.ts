/**
 * Standalone HTTP tRPC server for web mode.
 * Reuses the desktop app router with an Electron shim (real FS, git, SQLite, agents).
 * Electron mock is loaded via `bun --preload` (see package.json).
 */
import { createHTTPServer } from "@trpc/server/adapters/standalone"
import { initAuthManager } from "../main/auth-manager"
import { initDatabase } from "../main/lib/db"
import { createAppRouter } from "../main/lib/trpc/routers"

const PORT = Number(process.env.WEB_API_PORT || 3777)

async function main(): Promise<void> {
  initDatabase()
  initAuthManager(false)

  const appRouter = createAppRouter(() => null)

  const server = createHTTPServer({
    router: appRouter,
    createContext: () => ({ getWindow: () => null }),
    middleware: (req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", "*")
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
      res.setHeader(
        "Access-Control-Allow-Headers",
        "content-type, x-trpc-source, x-desktop-token",
      )
      if (req.method === "OPTIONS") {
        res.writeHead(204)
        res.end()
        return
      }
      next()
    },
  })

  server.listen(PORT, () => {
    console.log(`[web-server] tRPC API listening on http://localhost:${PORT}`)
    console.log(
      `[web-server] Data dir: ${process.env.WEB_STANDALONE_SERVER ? "~/.1code-web" : ""}`,
    )
  })
  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `[web-server] Port ${PORT} is already in use. Stop the other process or set WEB_API_PORT.`,
      )
    } else {
      console.error("[web-server] Server error:", error)
    }
    process.exit(1)
  })
}

main().catch((error) => {
  console.error("[web-server] Failed to start:", error)
  process.exit(1)
})
