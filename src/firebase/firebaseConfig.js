import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';


const firebaseConfig = {
  apiKey: "AIzaSyDkHkv0Nz7KkhC6IknOyKx6eZVrhii0RTU",
  authDomain: "plocklistare.firebaseapp.com",
  projectId: "plocklistare",
  storageBucket: "plocklistare.firebasestorage.app",
  messagingSenderId: "166408706864",
  appId: "1:166408706864:web:4d2e0b42189df93da246f5",
  measurementId: "G-HK703CX7ES"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const configuredStorageBucket = firebaseConfig.storageBucket;

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);
