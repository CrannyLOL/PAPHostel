import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDrVkmnwccEAY_SXhorkZv1Z-bglKe64yI",
  authDomain: "pap-hostel-app.firebaseapp.com",
  projectId: "pap-hostel-app",
  storageBucket: "pap-hostel-app.firebasestorage.app",
  messagingSenderId: "434905741371",
  appId: "1:434905741371:web:dc8b7699abae888ca2041e",
  measurementId: "G-BJQHQYR786"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
