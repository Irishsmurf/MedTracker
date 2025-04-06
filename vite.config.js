import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite" // Import loadEnv


const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Replace placeholders in SW (and potentially other JS) during build
    // Use JSON.stringify for string values to ensure correct replacement
    '__VITE_FIREBASE_API_KEY__': JSON.stringify(env.VITE_FIREBASE_API_KEY),
    '__VITE_FIREBASE_AUTH_DOMAIN__': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
    '__VITE_FIREBASE_PROJECT_ID__': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
    '__VITE_FIREBASE_STORAGE_BUCKET__': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
    '__VITE_FIREBASE_MESSAGING_SENDER_ID__': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
    '__VITE_FIREBASE_APP_ID__': JSON.stringify(env.VITE_FIREBASE_APP_ID),
    // You might need to define process.env stuff if libraries expect it
    // 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  }
})
