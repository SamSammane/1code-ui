type MainViteEnv = Record<string, string | undefined>

/** Vite injects `import.meta.env` at build time; absent when running via tsx/web-server. */
export function getMainViteEnv(): MainViteEnv {
  const meta = import.meta as ImportMeta & { env?: MainViteEnv }
  return meta.env ?? {}
}

export function getMainViteEnvString(
  key: string,
  fallback = "",
): string {
  const value = getMainViteEnv()[key]
  return value ?? fallback
}
