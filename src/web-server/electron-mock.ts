/**

 * Electron API mock for the standalone web API server.

 * Agents, git, and filesystem run on the host machine (same as desktop).

 */

import { homedir } from "node:os"

import { join } from "node:path"

import { mkdirSync } from "node:fs"



const repoRoot = process.cwd()

const userData = join(homedir(), ".1code-web")

mkdirSync(userData, { recursive: true })

mkdirSync(join(userData, "tmp"), { recursive: true })



export const app = {

  getPath(name: string): string {

    if (name === "userData") return userData

    if (name === "home") return homedir()

    if (name === "temp") return join(userData, "tmp")

    if (name === "exe") return process.execPath

    if (name === "appData") return join(homedir(), "AppData", "Roaming")

    return homedir()

  },

  getAppPath(): string {

    return repoRoot

  },

  setPath: () => {},

  isPackaged: false,

  getVersion: () => "web-server",

  getName: () => "1Code Web",

  commandLine: {

    appendSwitch: () => {},

    appendArgument: () => {},

  },

  on: () => {},

  whenReady: () => Promise.resolve(),

  quit: () => {},

}



export class BrowserWindow {

  static getAllWindows() {

    return []

  }

  webContents = { send: () => {}, on: () => {} }

  on = () => {}

  loadURL = async () => {}

  isDestroyed = () => false

}



export const shell = {

  openExternal: async () => {},

  showItemInFolder: async () => {},

}



export const dialog = {

  showOpenDialog: async () => ({ canceled: true, filePaths: [] as string[] }),

  showSaveDialog: async () => ({ canceled: true, filePath: undefined }),

}



export const safeStorage = {

  isEncryptionAvailable: () => false,

  encryptString: (value: string) => Buffer.from(value, "utf-8"),

  decryptString: (buffer: Buffer) => buffer.toString("utf-8"),

}



export const clipboard = {

  readText: () => "",

  writeText: () => {},

}



const cookieStore = new Map<string, string>()



export const session = {

  fromPartition: () => ({

    cookies: {

      remove: async () => {},

      set: async (details: { name: string; value: string }) => {

        cookieStore.set(details.name, details.value)

      },

      get: async () => [],

    },

  }),

  defaultSession: {

    cookies: {

      remove: async () => {},

      set: async () => {},

      get: async () => [],

    },

  },

}



export const ipcMain = {

  on: () => {},

  handle: () => {},

  removeHandler: () => {},

}



export const nativeTheme = { on: () => {} }

export const protocol = { registerSchemesAsPrivileged: () => {} }


