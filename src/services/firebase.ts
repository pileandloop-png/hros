import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

export const firebaseConfig = {
  apiKey: "AIzaSyBeDVhbia9hYdO7qQlDxTMv4oFupjMd4aQ",
  authDomain: "hros-e27e0.firebaseapp.com",
  projectId: "hros-e27e0",
  storageBucket: "hros-e27e0.firebasestorage.app",
  messagingSenderId: "969013133474",
  appId: "1:969013133474:web:a1702e92bceedf1f3a17fb",
  measurementId: "G-4CNH4CKNY9"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');