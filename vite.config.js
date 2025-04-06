import path from "path"
import fs from 'fs'; // Import Node.js filesystem module
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

// Plugin to handle replacing placeholders in SW during dev
const serviceWorkerDevPlugin = () => ({
    name: 'replace-sw-placeholders-dev',
    // Use configureServer hook to add middleware to the dev server
    configureServer(server) {
        // Load environment variables based on the current mode
        const env = loadEnv(server.config.mode, process.cwd(), '');

        server.middlewares.use(async (req, res, next) => {
            // Intercept requests for the service worker file
            if (req.url === '/firebase-messaging-sw.js') {
                try {
                    // Define the path to the original SW file in the public directory
                    const swPath = path.resolve(__dirname, 'public', 'firebase-messaging-sw.js');
                    // Read the original file content
                    let swContent = await fs.promises.readFile(swPath, 'utf-8');

                    // Replace placeholders with actual environment variable values
                    swContent = swContent
                        .replace(/__VITE_FIREBASE_API_KEY__/g, env.VITE_FIREBASE_API_KEY || '')
                        .replace(/__VITE_FIREBASE_AUTH_DOMAIN__/g, env.VITE_FIREBASE_AUTH_DOMAIN || '')
                        .replace(/__VITE_FIREBASE_PROJECT_ID__/g, env.VITE_FIREBASE_PROJECT_ID || '')
                        .replace(/__VITE_FIREBASE_STORAGE_BUCKET__/g, env.VITE_FIREBASE_STORAGE_BUCKET || '')
                        .replace(/__VITE_FIREBASE_MESSAGING_SENDER_ID__/g, env.VITE_FIREBASE_MESSAGING_SENDER_ID || '')
                        .replace(/__VITE_FIREBASE_APP_ID__/g, env.VITE_FIREBASE_APP_ID || '');

                    // Send the modified content back to the browser
                    res.setHeader('Content-Type', 'application/javascript');
                    res.end(swContent);
                    return; // Stop further processing for this request

                } catch (error) {
                    console.error(`Error processing service worker (${req.url}):`, error);
                    res.statusCode = 500;
                    res.end('Error processing service worker');
                    return;
                }
            }
            // If the URL doesn't match, pass the request to the next middleware
            next();
        });
    }
});


// Main Vite config
export default defineConfig(({ mode }) => {
    // Load env vars for use in the define block (for production build)
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [
            react(),
            tailwindcss(),
            // Add the custom plugin ONLY for development mode
            mode === 'development' ? serviceWorkerDevPlugin() : null
        ],
        resolve: {
            alias: {
            "@": path.resolve(__dirname, "./src"),
            },
        },
        // Keep the define block for PRODUCTION builds
        define: {
            '__VITE_FIREBASE_API_KEY__': JSON.stringify(env.VITE_FIREBASE_API_KEY),
            '__VITE_FIREBASE_AUTH_DOMAIN__': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
            '__VITE_FIREBASE_PROJECT_ID__': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
            '__VITE_FIREBASE_STORAGE_BUCKET__': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
            '__VITE_FIREBASE_MESSAGING_SENDER_ID__': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
            '__VITE_FIREBASE_APP_ID__': JSON.stringify(env.VITE_FIREBASE_APP_ID),
        }
    }
});
