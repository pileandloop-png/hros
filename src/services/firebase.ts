export * from './store';
export { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, setMockUser } from './mock/auth';
export { getStorage, ref, uploadBytesResumable, getDownloadURL } from './mock/storage';
export { getFunctions, httpsCallable } from './mock/functions';
export { initializeApp } from './mock/app';

export const firebaseConfig = {
  apiKey: "AIzaSyBeDVhbia9hYdO7qQlDxTMv4oFupjMd4aQ",
  authDomain: "hros-e27e0.firebaseapp.com",
  projectId: "hros-e27e0",
  storageBucket: "hros-e27e0.firebasestorage.app",
  messagingSenderId: "969013133474",
  appId: "1:969013133474:web:a1702e92bceedf1f3a17fb",
  measurementId: "G-4CNH4CKNY9"
};

export const app = { name: 'pile-and-loop-hros' };
export const auth = { currentUser: null };
export const db = { type: 'persistent-store' };
export const storage = { type: 'persistent-storage' };
export const functions = { type: 'mock-functions' };
