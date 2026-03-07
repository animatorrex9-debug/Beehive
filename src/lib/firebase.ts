import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBUj2RJ8ASOY7sQovBeRkQWs7wOMJpIQq4",
  authDomain: "beehive-20.firebaseapp.com",
  projectId: "beehive-20",
  storageBucket: "beehive-20.firebasestorage.app",
  messagingSenderId: "47279612001",
  appId: "1:47279612001:web:add43bda63b756a9668a20",
  measurementId: "G-2MJM2J6518"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export { app, auth, db, storage, analytics };
