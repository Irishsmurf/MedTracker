import { useState, useEffect } from 'react';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, app } from '../firebaseConfig'; // Assuming firebaseConfig.js exports app

// Initialize Firebase Messaging
// It's important that 'app' from firebaseConfig is correctly initialized
// And that this hook can access it to initialize messaging.
let messagingInstance = null;
isSupported().then((supported) => {
  if (supported) {
    messagingInstance = getMessaging(app);
  }
});


const useNotifications = (user) => {
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const [isFcmSupported, setIsFcmSupported] = useState(false);

  useEffect(() => {
    isSupported().then((supported) => {
      setIsFcmSupported(supported);
      if (supported) {
        setNotificationPermission(Notification.permission);
      }
    });
  }, []); // Check support on mount

  // Update permission state if it changes globally (e.g., user changes it in browser settings)
  useEffect(() => {
    if (isFcmSupported) {
      const interval = setInterval(() => {
        if (Notification.permission !== notificationPermission) {
          setNotificationPermission(Notification.permission);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isFcmSupported, notificationPermission]);

  const handleRequestNotificationPermission = async () => {
    if (!isFcmSupported) {
      // UI should ideally inform the user, or this button might be disabled.
      return;
    }
    if (!user) {
      // UI should ideally inform the user, or this button might be disabled/hidden.
      return;
    }
    if (!messagingInstance) {
      // This is an internal state issue; errors should propagate if critical.
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        // Get token
        const currentToken = await getToken(messagingInstance, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        });

        if (currentToken) {
          const tokenRef = doc(db, `users/${user.uid}/fcmTokens/${currentToken}`);
          await setDoc(tokenRef, {
            token: currentToken,
            createdAt: serverTimestamp(),
            userAgent: navigator.userAgent, // Optional: store user agent
          });
        } else {
          // It might be useful to inform the user via UI if token generation fails
        }
      } else {
        // UI should reflect that permission was not granted.
      }
    } catch (error) {
      console.error('Error requesting notification permission or getting token:', error);
    }
  };

  return {
    notificationPermission,
    handleRequestNotificationPermission,
    isFcmSupported,
  };
};

export default useNotifications;
