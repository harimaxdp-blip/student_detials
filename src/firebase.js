import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyChRWGMaVxhAg68YZHncdYpLJ2hbCA-pio",
  authDomain: "studentfrom-91419.firebaseapp.com",
  projectId: "studentfrom-91419",
  storageBucket: "studentfrom-91419.firebasestorage.app",
  messagingSenderId: "320801508715",
  appId: "1:320801508715:web:c4908f6547e4adf15d102e",
  measurementId: "G-56H0BHELBE",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);