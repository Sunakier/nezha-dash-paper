import react from "@vitejs/plugin-react-swc"
import { execSync } from "child_process"
import fs from "fs"
import path from "path"
import { defineConfig, loadEnv } from "vite"

// Get git commit hash
const getGitHash = () => {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim()
  } catch (e) {
    console.log(e)
    return "unknown"
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), "")

  // Log environment variables
  console.log("process.env.VITE_PROXY_WS_TARGET:", process.env.VITE_PROXY_WS_TARGET)
  console.log("env.VITE_PROXY_WS_TARGET:", env.VITE_PROXY_WS_TARGET)

  return {
    base: "/",
    define: {
      "import.meta.env.VITE_GIT_HASH": JSON.stringify(getGitHash()),
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      https: {
        key: fs.readFileSync("./.cert/key.pem"),
        cert: fs.readFileSync("./.cert/cert.pem"),
      },
      proxy: {
        "/api/v1/ws/server": {
          target: env.VITE_PROXY_WS_TARGET || "ws://127.0.0.1:8008",
          changeOrigin: true,
          ws: true,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          configure: (proxy, _options) => {
            // Handle HTTP requests
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            proxy.on("proxyReq", (proxyReq, _req, _res) => {
              // Set the origin header to match the target server
              const targetUrl = new URL(env.VITE_PROXY_WS_TARGET || "ws://127.0.0.1:8008")
              proxyReq.setHeader("Origin", targetUrl.origin)
            })

            // Handle WebSocket connections
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            proxy.on("proxyReqWs", (proxyReq, _req, _socket, _options, _head) => {
              // Set the origin header to match the target server
              const targetUrl = new URL(env.VITE_PROXY_WS_TARGET || "ws://127.0.0.1:8008")
              proxyReq.setHeader("Origin", targetUrl.origin)
            })
          },
        },
        "/api/v1/": {
          target: env.VITE_PROXY_HTTP_TARGET || "http://127.0.0.1:8008",
          changeOrigin: true,
        },
      },
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          entryFileNames: `assets/[name].[hash].js`,
          chunkFileNames: `assets/[name].[hash].js`,
          assetFileNames: `assets/[name].[hash].[ext]`,
          manualChunks(id) {
            if (id.includes("node_modules")) {
              return id.toString().split("node_modules/")[1].split("/")[0].toString()
            }
          },
        },
      },
      chunkSizeWarningLimit: 1500,
    },
  }
})
