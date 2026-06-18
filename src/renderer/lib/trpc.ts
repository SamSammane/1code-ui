import { createTRPCReact } from "@trpc/react-query"
import { createTRPCProxyClient, type TRPCClient } from "@trpc/client"
import type { AppRouter } from "../../main/lib/trpc/routers"
import { createAppTrpcLinks } from "./trpc-links"

/**
 * React hooks for tRPC
 */
export const trpc = createTRPCReact<AppRouter>()

let _trpcClient: TRPCClient<AppRouter> | null = null

export function getTrpcClient(): TRPCClient<AppRouter> {
  if (!_trpcClient) {
    _trpcClient = createTRPCProxyClient<AppRouter>({
      links: createAppTrpcLinks(),
    })
  }
  return _trpcClient
}

/**
 * Vanilla client for use outside React components (stores, utilities)
 */
export const trpcClient = new Proxy({} as TRPCClient<AppRouter>, {
  get(_target, prop, receiver) {
    return Reflect.get(getTrpcClient(), prop, receiver)
  },
})
