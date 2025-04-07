import path from "path"
import fs from 'fs'; // Import Node.js filesystem module
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite" // Import loadEnv

// Plugin to handle replacing placeholders in SW during dev
const serviceWorkerDevPlugin = () => ({
    name: 'replace-sw-placeholders-dev',
    configureServer(server) {
        // --- DEBUG LOG ---
        console.log('[Plugin] configureServer hook running...');

        // Load environment variables based on the current mode
        const env = loadEnv(server.config.mode, process.cwd(), '');
        // --- DEBUG LOG ---
        console.log('[Plugin] Loaded Env Vars:', env); // Log loaded vars (check if VITE_FIREBASE keys are present)

        server.middlewares.use(async (req, res, next) => {
            // --- DEBUG LOG ---
            // console.log(`[Middleware] Request URL: ${req.url}`); // Log all requests (can be noisy)

            if (req.url === '/firebase-messaging-sw.js') {
                // --- DEBUG LOG ---
                console.log('[Middleware] Intercepting /firebase-messaging-sw.js');
                try {
                    const swPath = path.resolve(__dirname, 'public', 'firebase-messaging-sw.js');
                    // --- DEBUG LOG ---
                    console.log(`[Middleware] Reading SW file from: ${swPath}`);

                    let swContent = await fs.promises.readFile(swPath, 'utf-8');
                    // --- DEBUG LOG ---
                    // console.log('[Middleware] Original SW Content:', swContent.substring(0, 200)); // Log start of content

                    // Perform replacements
                    swContent = swContent
                        .replace(/__VITE_FIREBASE_API_KEY__/g, env.VITE_FIREBASE_API_KEY || '')
                        .replace(/__VITE_FIREBASE_AUTH_DOMAIN__/g, env.VITE_FIREBASE_AUTH_DOMAIN || '')
                        .replace(/__VITE_FIREBASE_PROJECT_ID__/g, env.VITE_FIREBASE_PROJECT_ID || '')
                        .replace(/__VITE_FIREBASE_STORAGE_BUCKET__/g, env.VITE_FIREBASE_STORAGE_BUCKET || '')
                        .replace(/__VITE_FIREBASE_MESSAGING_SENDER_ID__/g, env.VITE_FIREBASE_MESSAGING_SENDER_ID || '')
                        .replace(/__VITE_FIREBASE_APP_ID__/g, env.VITE_FIREBASE_APP_ID || '');

                    // --- DEBUG LOG ---
                    console.log('[Middleware] SW Content AFTER replacement (first 200 chars):', swContent.substring(0, 800)); // Check if placeholders are gone

                    res.setHeader('Content-Type', 'application/javascript');
                    res.end(swContent);
                    console.log('[Middleware] Sent modified SW content.'); // Log success
                    return;

                } catch (error) {
                    console.error(`[Middleware] Error processing service worker (${req.url}):`, error);
                    res.statusCode = 500;
                    res.end('Error processing service worker');
                    return;
                }
            }
            // Pass to next middleware if URL doesn't match
            next();
        });
    }
});


// Main Vite config
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    // --- DEBUG LOG ---
    console.log(`Vite config running in mode: ${mode}`);

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
