import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export async function signInWithGooglePopup() {
  const credential = await signInWithPopup(auth, googleAuthProvider);
  const idToken = await credential.user.getIdToken();
  return {
    idToken,
    uid: credential.user.uid,
    email: credential.user.email || '',
    displayName: credential.user.displayName || credential.user.email || 'Google User',
    photoURL: credential.user.photoURL || '',
  };
}

export async function signOutFirebase() {
  await signOut(auth);
}
