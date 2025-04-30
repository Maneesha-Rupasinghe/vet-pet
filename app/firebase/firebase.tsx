// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBCs-tvecIWV1Mw3iVJ9qlQO3RoAiMNFfE",
    authDomain: "vet-pet-fe1c4.firebaseapp.com",
    projectId: "vet-pet-fe1c4",
    storageBucket: "vet-pet-fe1c4.firebasestorage.app",
    messagingSenderId: "501036286726",
    appId: "1:501036286726:web:f0e12db8643e4ebb319487"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app)
const db = getFirestore(app)

export { auth, app, db }