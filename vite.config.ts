import react from "@vitejs/plugin-react-swc"
import { execSync } from "child_process"
import fs from "fs"
import path from "path"
import { defineConfig } from "vite"

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
export default defineConfig({
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
        target: "ws://127.0.0.1:8008",
        changeOrigin: true,
        ws: true,
      },
      "/api/v1/": {
        target: "http://127.0.0.1:8008",
        changeOrigin: true,
      },
    },
    headers: {
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`,
        manualChunks(id) {
          // Group packages into logical chunks instead of one chunk per package
          if (id.includes("node_modules")) {
            // React and related packages
            if (id.includes("react") || 
                id.includes("scheduler") || 
                id.includes("prop-types")) {
              return "react-vendor"
            }

            // UI component libraries
            if (id.includes("@radix-ui") || 
                id.includes("@heroicons") || 
                id.includes("lucide-react") ||
                id.includes("class-variance-authority") ||
                id.includes("clsx") ||
                id.includes("tailwind-merge")) {
              return "ui-components"
            }

            // Data visualization and charts
            if (id.includes("recharts") || 
                id.includes("d3") || 
                id.includes("victory")) {
              return "data-viz"
            }

            // Utilities and other dependencies
            if (id.includes("@tanstack") || 
                id.includes("i18next") || 
                id.includes("luxon") || 
                id.includes("dayjs")) {
              return "utils"
            }

            // For other dependencies, group them in a common vendor chunk
            return "vendor"
          }
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
})
