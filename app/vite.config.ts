import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import { imageGenerationApiPlugin } from './server/viteImageGenerationPlugin.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const serverEnv = loadEnv(mode, process.cwd(), '')
  if (!process.env.IMAGE_GENERATION_MODE && serverEnv.IMAGE_GENERATION_MODE) {
    process.env.IMAGE_GENERATION_MODE = serverEnv.IMAGE_GENERATION_MODE
  }
  if (!process.env.OPENAI_API_KEY && serverEnv.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = serverEnv.OPENAI_API_KEY
  }
  return {
    base: './',
    plugins: [imageGenerationApiPlugin(), inspectAttr(), react()],
    server: {
      port: 3000,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
});
