import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"
import tailwindcss from "tailwindcss"
import autoprefixer from "autoprefixer"

const WEB_API_PORT = process.env.WEB_API_PORT || "3777"

/**
 * Browser-only dev/build for the renderer (no Electron main/preload).
 * `bun run dev:web` — local API server + Vite with `/api` proxy (real agents/git).
 * `bun run dev:web:stub` — Vite only with localStorage stubs (`--mode stub`).
 */
export default defineConfig(({ mode }) => {
  const stubOnly = mode === "stub"

  return {
    root: resolve(__dirname, "src/renderer"),
    define: {
      "import.meta.env.VITE_WEB_STANDALONE": JSON.stringify("true"),
      "import.meta.env.VITE_WEB_API_URL": JSON.stringify(
        stubOnly ? "false" : "/api",
      ),
    },
    plugins: [
      react(),
      {
        name: "web-entry",
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            if (req.url === "/" || req.url === "/index.html") {
              req.url = "/index-web.html"
            }
            next()
          })
        },
      },
    ],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src/renderer"),
        "trpc-electron/renderer": resolve(
          __dirname,
          "src/renderer/lib/web/trpc-electron-stub.ts",
        ),
      },
    },
    optimizeDeps: {
      exclude: ["trpc-electron/renderer"],
    },
    server: {
      port: 5173,
      strictPort: false,
      proxy: stubOnly
        ? undefined
        : {
            "/api": {
              target: `http://127.0.0.1:${WEB_API_PORT}`,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api/, ""),
            },
          },
    },
    css: {
      postcss: {
        plugins: [
          tailwindcss({ config: resolve(__dirname, "tailwind.config.js") }),
          autoprefixer(),
        ],
      },
    },
    build: {
      outDir: resolve(__dirname, "dist-web"),
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(__dirname, "src/renderer/index-web.html"),
      },
    },
  }
})
