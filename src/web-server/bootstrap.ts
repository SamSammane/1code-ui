/**
 * Bootstrap: patch electron before loading the HTTP server entry.
 */
import { createRequire } from "node:module"
import { fileURLToPath, pathToFileURL } from "node:url"

process.env.WEB_STANDALONE_SERVER = "1"

const require = createRequire(import.meta.url)
const Module = require("node:module") as typeof import("node:module") & {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown
}

const mockPath = fileURLToPath(new URL("./electron-mock.ts", import.meta.url))
const electronMock = require(mockPath)

const originalLoad = Module._load
Module._load = function patchedLoad(
  request: string,
  parent: unknown,
  isMain: boolean,
) {
  if (request === "electron") {
    return electronMock
  }
  return originalLoad.call(this, request, parent, isMain)
}

const entry = pathToFileURL(
  fileURLToPath(new URL("./index.ts", import.meta.url)),
).href
import(entry).catch((error: unknown) => {
  console.error("[web-server] Failed to start:", error)
  process.exit(1)
})
