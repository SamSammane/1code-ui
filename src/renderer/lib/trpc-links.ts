import type { TRPCLink } from "@trpc/client"
import {
  httpBatchLink,
  httpSubscriptionLink,
  splitLink,
} from "@trpc/client"
import { ipcLink } from "trpc-electron/renderer"
import type { AppRouter } from "../../main/lib/trpc/routers"
import superjson from "superjson"
import { getWebApiUrl } from "./web/web-api-config"
import { createWebTrpcLink } from "./web/trpc-stub-link"
import { shouldUseWebTrpcLinks } from "./web/web-runtime"

export { isWebApiBackendEnabled, isWebStubMode, getWebApiUrl } from "./web/web-api-config"

export function createAppTrpcLinks(): TRPCLink<AppRouter>[] {
  if (shouldUseWebTrpcLinks()) {
    const apiUrl = getWebApiUrl()
    if (apiUrl) {
      return [
        splitLink({
          condition: (op) => op.type === "subscription",
          true: httpSubscriptionLink({
            url: apiUrl,
            transformer: superjson,
          }),
          false: httpBatchLink({
            url: apiUrl,
            transformer: superjson,
          }),
        }),
      ]
    }
    return [createWebTrpcLink()]
  }
  return [ipcLink({ transformer: superjson })]
}
