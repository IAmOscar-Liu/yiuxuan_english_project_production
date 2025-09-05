// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
// Added the import for Firebase Storage
import { getStorage } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAkGB3Cmw8MVaxjjcD9dGEAhrIdqtDVZHE",
  authDomain: "yoshunengloshproject.firebaseapp.com",
  projectId: "yoshunengloshproject",
  storageBucket: "yoshunengloshproject.firebasestorage.app",
  messagingSenderId: "980913645492",
  appId: "1:980913645492:web:51a87b648bfef89e3ab4e1",
  measurementId: "G-5XV4VF9C2X",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// Initialize Firebase Storage and get a reference to the service
const storage = getStorage(app);

export { app, db, storage };
