import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"
import tailwindcss from "tailwindcss"
import autoprefixer from "autoprefixer"

/**
 * Browser-only dev/build for the renderer (no Electron main/preload).
 * Branch: web — use `bun run dev:web`
 */
export default defineConfig({
  root: resolve(__dirname, "src/renderer"),
  define: {
    "import.meta.env.VITE_WEB_STANDALONE": JSON.stringify("true"),
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
  server: {
    port: 5173,
    strictPort: false,
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
})
