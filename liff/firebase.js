// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
// Added the import for Firebase Storage
import { getStorage } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyABy-Wm-fbi-fMVHqpdb0opw-Xjw1cgYD8",
  authDomain: "test-project-001-5703b.firebaseapp.com",
  databaseURL: "https://test-project-001-5703b-default-rtdb.firebaseio.com",
  projectId: "test-project-001-5703b",
  storageBucket: "test-project-001-5703b.firebasestorage.app",
  messagingSenderId: "741078952479",
  appId: "1:741078952479:web:bd32c7e645dca8c8b1c32a",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// Initialize Firebase Storage and get a reference to the service
const storage = getStorage(app);

export { app, db, storage };
