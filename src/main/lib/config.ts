/**
 * Shared configuration for the desktop app
 */
import { app } from "electron"
import { getMainViteEnv, getMainViteEnvString } from "./vite-main-env"

const IS_DEV = !!process.env.ELECTRON_RENDERER_URL
const DEFAULT_VENDOR_API = "https://21st.dev"

function parseEnvBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === "") return defaultValue
  return value !== "false" && value !== "0" && value !== "no"
}

/**
 * When true, users must sign in via the vendor cloud account before using the app.
 * Defaults to false so local/open-source builds run without a vendor account.
 */
export function isVendorAuthEnabled(): boolean {
  return parseEnvBool(getMainViteEnv().MAIN_VITE_VENDOR_AUTH, false)
}

/**
 * Whether the main app UI can load (standalone mode or authenticated).
 */
export function canAccessApp(isAuthenticated: boolean): boolean {
  return !isVendorAuthEnabled() || isAuthenticated
}

/**
 * Get the vendor API base URL, if configured.
 * Returns an empty string in standalone mode unless MAIN_VITE_API_URL is set.
 */
export function getApiUrl(): string {
  const configured = getMainViteEnvString("MAIN_VITE_API_URL")
  if (configured) return configured
  if (isVendorAuthEnabled()) return DEFAULT_VENDOR_API
  return ""
}

/** Alias used by sandbox import and auth flows */
export function getBaseUrl(): string {
  return getApiUrl()
}

/**
 * Check if running in development mode
 */
export function isDev(): boolean {
  return IS_DEV
}
