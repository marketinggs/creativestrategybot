// firebaseConfig.ts
// IMPORTANT: Replace the placeholder values below with your actual Firebase project configuration.
// You can find this configuration in your Firebase project settings.
// THIS FILE IS NO LONGER USED BY THE APPLICATION AFTER MIGRATION TO SUPABASE.

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth'; // connectAuthEmulator removed as it's dev only
import { getFirestore, Firestore } from 'firebase/firestore'; // connectFirestoreEmulator removed
import { getStorage, FirebaseStorage } from 'firebase/storage'; // connectStorageEmulator removed

const initialFirebaseConfigValues = {
  apiKey: "AIzaSyByHRtnsNq2Aybe7PaTV2Lef9Qo0MLhK_c",
  authDomain: "fir-a3bfd.firebaseapp.com",
  projectId: "fir-a3bfd",
  storageBucket: "fir-a3bfd.appspot.com", // This was the corrected placeholder format
  messagingSenderId: "241194807326",
  appId: "1:241194807326:web:2abf80610b3d5c053d7e0f",
  measurementId: "YOUR_MEASUREMENT_ID" // Optional
};

const firebaseConfig = { ...initialFirebaseConfigValues }; // Use a copy for runtime

// Check if all required config values are present AND different from initial placeholders
const requiredKeys: (keyof typeof initialFirebaseConfigValues)[] = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const isConfigured = requiredKeys.every(key => 
    firebaseConfig[key] && 
    firebaseConfig[key] !== initialFirebaseConfigValues[key] &&  // Check against initial placeholder
    !String(firebaseConfig[key]).startsWith("YOUR_") // General "YOUR_" check
);


let app: FirebaseApp | null = null; // Initialize as null
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;


if (isConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  console.log("Firebase app configured (though Supabase is now primary).");

  // Emulator configuration was here, removed for clarity as this file is deprecated.
  // If needed for temporary Firebase use, refer to previous versions.

} else {
  console.warn(
    "Firebase is not configured correctly. Please update firebaseConfig.ts with your project's credentials. " +
    "Ensure 'storageBucket' is in the format 'YOUR_PROJECT_ID.appspot.com'. " +
    "Firebase-dependent features (like workshop data management) will not work until configured. " +
    "Note: The application has been migrated to Supabase. This Firebase config is likely obsolete."
  );
}

// Export as potentially null if not configured
export { app, auth, db, storage, isConfigured as isFirebaseConfigured };