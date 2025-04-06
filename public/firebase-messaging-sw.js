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
  
        // IMPORTANT: You usually DON'T need to initialize the app here again
        // if your main web app initializes Firebase correctly before calling getToken().
        // Firebase implicitly associates this SW with your app config.
  
        // Example: Basic check to confirm script loaded
        console.log("Firebase Messaging Service Worker script loaded and registered.");
  
        // --- Optional: Add Background Message Handler Later ---
        // You would uncomment and configure this later to handle notifications
        // when your app tab is not active.
        /*
        // Initialize Firebase (ONLY if needed, often not necessary here)
        // const firebaseConfig = { apiKey: "...", authDomain: "...", ... };
        // firebase.initializeApp(firebaseConfig);
  
        const messaging = firebase.messaging(); // Get messaging instance (compat)
  
        messaging.onBackgroundMessage((payload) => {
          console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
          // Customize notification here based on payload
          const notificationTitle = payload.notification?.title || 'New Notification';
          const notificationOptions = {
            body: payload.notification?.body || 'You have a new message.',
            icon: payload.notification?.icon || '/favicon.ico' // Use your app's icon
            // Add other options like badge, actions, data, etc.
          };
  
          // Use the Service Worker's registration to show the notification
          self.registration.showNotification(notificationTitle, notificationOptions);
        });
        */
  
      } catch (error) {
          console.error("Error loading Firebase scripts in Service Worker:", error);
      }
  
      