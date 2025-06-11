import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '../firebaseConfig'; // Assuming firebaseConfig.js is in the parent directory

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setLoadingAuth(true);
      await signInWithPopup(auth, provider);
      // The onAuthStateChanged listener will update the user state
    } catch (error) {
      console.error("Error signing in with Google: ", error);
      // setLoadingAuth(false); // Potentially set loading to false here if sign-in fails
    }
    // setLoadingAuth(false) // Moved to onAuthStateChanged
  };

  const handleSignOut = async () => {
    try {
      setLoadingAuth(true);
      await firebaseSignOut(auth);
      // The onAuthStateChanged listener will update the user state to null
    } catch (error) {
      console.error("Error signing out: ", error);
      // setLoadingAuth(false); // Potentially set loading to false here if sign-out fails
    }
    // setLoadingAuth(false) // Moved to onAuthStateChanged
  };

  return {
    user,
    loadingAuth,
    handleSignIn,
    handleSignOut,
  };
};

export default useAuth;
