/**
 * Firebase Cloud Messaging Service Worker
 *
 * This file needs to be placed in the 'public' directory so that it's
 * served from the root of your domain (e.g., /firebase-messaging-sw.js).
 */

// Import the Firebase SDK scripts using importScripts (standard for service workers)
// Make sure the version numbers match the Firebase version you installed with npm,
// or use reasonably up-to-date versions.
// Using compat libraries here as they are often simpler within service workers.
try {
    importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js');

    // Example: Basic check to confirm script loaded
    console.log("Firebase Messaging Service Worker script loaded and registered.");

    // Use placeholders for config values
    const firebaseConfig = {
        apiKey: "__VITE_FIREBASE_API_KEY__", // Placeholder
        authDomain: "__VITE_FIREBASE_AUTH_DOMAIN__", // Placeholder
        projectId: "__VITE_FIREBASE_PROJECT_ID__", // Placeholder
        storageBucket: "__VITE_FIREBASE_STORAGE_BUCKET__", // Placeholder
        messagingSenderId: "__VITE_FIREBASE_MESSAGING_SENDER_ID__", // Placeholder
        appId: "__VITE_FIREBASE_APP_ID__" // Placeholder
    };

    // Initialize Firebase App within the Service Worker
    try {
        if (firebaseConfig.apiKey !== "__VITE_FIREBASE_API_KEY__") { // Basic check if replaced
            firebase.initializeApp(firebaseConfig);
            const messaging = firebase.messaging();
            console.log("Firebase Messaging Service Worker Initialized with config.");

            // Background Message Handler (keep your existing handler logic here)
            messaging.onBackgroundMessage((payload) => {
                console.log('[firebase-messaging-sw.js] Received background message ', payload);
                const notificationTitle = payload.notification?.title || 'Medication Reminder';
                const notificationOptions = { /* ... options ... */ };
                return self.registration.showNotification(notificationTitle, notificationOptions);
            });

        } else {
            console.warn("Service Worker: Firebase config placeholders not replaced during build.");
        }
    }
    catch (error) {
        console.error("Error initializing Firebase Messaging Service Worker:", error);
    }
}
catch (error) {
    console.error("Error initializing Firebase Messaging Service Worker:", error);
}