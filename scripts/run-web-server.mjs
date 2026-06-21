/**
 * Run the web API server under Electron-as-Node so better-sqlite3 (Electron ABI) loads.
 */
import { spawn } from "node:child_process"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const require = createRequire(import.meta.url)
const electronPath = require("electron")
const tsxCli = join(root, "node_modules/tsx/dist/cli.mjs")
const bootstrap = join(root, "src/web-server/bootstrap.ts")

const child = spawn(electronPath, [tsxCli, bootstrap], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    WEB_STANDALONE_SERVER: "1",
  },
})

child.on("exit", (code) => {
  process.exit(code ?? 0)
})
