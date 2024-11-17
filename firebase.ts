import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCQh_hz9fujaiU7DNi_1vp_8d4a4Qkltss",
  authDomain: "e-voting-fe2c3.firebaseapp.com",
  projectId: "e-voting-fe2c3",
  storageBucket: "e-voting-fe2c3.appspot.com",  // Fixed variable name here
  messagingSenderId: "298772738878",
  appId: "1:298772738878:web:799b13e3d190fe2be8326f",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

