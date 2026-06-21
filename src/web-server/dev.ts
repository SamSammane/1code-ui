/**
 * Start web API server + Vite dev server together.
 */
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")

const server = spawn("node", ["scripts/run-web-server.mjs"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, WEB_API_PORT: process.env.WEB_API_PORT || "3777" },
})

const vite = spawn(
  "bun",
  ["run", "vite", "--config", "vite.web.config.ts"],
  { cwd: root, stdio: "inherit", shell: true },
)

function shutdown(): void {
  server.kill()
  vite.kill()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

server.on("exit", (code) => {
  if (code && code !== 0) {
    console.error(`[dev:web] API server exited with code ${code}`)
    vite.kill()
    process.exit(code)
  }
})

vite.on("exit", (code) => {
  server.kill()
  process.exit(code ?? 0)
})
