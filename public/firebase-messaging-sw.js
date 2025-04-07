/**
 * Firebase Cloud Messaging Service Worker
 */

try {
    importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js');

    // Example: Basic check to confirm script loaded
    console.log("Firebase Messaging Service Worker script loaded and registered.");

    const firebaseConfig = {
        apiKey: "__VITE_FIREBASE_API_KEY__",
        authDomain: "__VITE_FIREBASE_AUTH_DOMAIN__",
        projectId: "__VITE_FIREBASE_PROJECT_ID__",
        storageBucket: "__VITE_FIREBASE_STORAGE_BUCKET__",
        messagingSenderId: "__VITE_FIREBASE_MESSAGING_SENDER_ID__",
        appId: "__VITE_FIREBASE_APP_ID__"
      };
      
      try {
        if (firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("__VITE_")) {
           firebase.initializeApp(firebaseConfig);
           const messaging = firebase.messaging();
           console.log("Firebase Messaging Service Worker Initialized.");
      
           messaging.onBackgroundMessage((payload) => {
             console.log('[firebase-messaging-sw.js] Received background message ', payload);
             const notificationTitle = payload.notification?.title || 'Medication Reminder';
             const notificationOptions = { /* ... options ... */ };
             return self.registration.showNotification(notificationTitle, notificationOptions);
           });
      
        } else {
            console.warn("Service Worker: Firebase config placeholders not replaced.");
        }
      } catch (error) {
        console.error("Error initializing Firebase Messaging Service Worker:", error);
      }
} catch (error) {
    console.error("Error loading Firebase Messaging Service Worker:", error);
}