import type { TRPCLink } from "@trpc/client"
import { ipcLink } from "trpc-electron/renderer"
import type { AppRouter } from "../../main/lib/trpc/routers"
import superjson from "superjson"
import { isWebStandalone } from "./utils/platform"
import { createWebTrpcLink } from "./web/trpc-stub-link"

export function createAppTrpcLinks(): TRPCLink<AppRouter>[] {
  if (isWebStandalone()) {
    return [createWebTrpcLink()]
  }
  return [ipcLink({ transformer: superjson })]
}
