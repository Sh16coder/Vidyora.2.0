// Your Firebase configuration from Step 1.2
const firebaseConfig = {
  apiKey: "AIzaSyBDD6jyyNFQtvGO7gibliRBMcIFuM4OqjA",
  authDomain: "whiteboard-a794c.firebaseapp.com",
  projectId: "whiteboard-a794c",
  storageBucket: "whiteboard-a794c.firebasestorage.app",
  messagingSenderId: "996768687477",
  appId: "1:996768687477:web:f0dfeb45b7a9c92c4b9f3c"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Teacher's fixed email
const TEACHER_EMAIL = "mathsbyshakeel@gmail.com";
