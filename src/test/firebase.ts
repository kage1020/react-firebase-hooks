import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

export const app = initializeApp({ projectId: 'demo-test' });

export const db = getFirestore(app);

// Only connect to emulator if not already connected
try {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
} catch (error) {
  // Emulator already connected or not available
  console.warn('Firestore emulator connection failed:', error);
}
