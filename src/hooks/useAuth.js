import { useState, useEffect, useCallback } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../firebaseConfig'; // Corrected path
import { toast } from 'sonner'; // Corrected to use sonner

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []); // auth is stable, no need to include in deps if imported directly

  const handleSignIn = useCallback(async () => {
    setLoadingAuth(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      toast.success('Signed in successfully!');
    } catch (error) {
      console.error('Error signing in:', error);
      toast.error('Error signing in. Please try again.');
    } finally {
      // setLoadingAuth(false); // onAuthStateChanged will handle this
    }
  }, []); // setLoadingAuth is part of useState, not needed in deps unless its identity changes, which it doesn't for basic setState

  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth);
      toast.success('Signed out successfully!');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error signing out. Please try again.');
    }
  }, []); // auth is stable

  return { user, loadingAuth, handleSignIn, handleSignOut };
};

export default useAuth;
