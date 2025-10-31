// ===========================
// Firebase Configuration
// ===========================

// Firebase configuration object
// Replace these values with your actual Firebase project credentials
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
let db = null;
let auth = null;
let storage = null;

try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    storage = firebase.storage();
    
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// ===========================
// Firebase Helper Functions
// ===========================

// Authentication
const FirebaseAuth = {
    // Sign in with email and password
    signIn: async (email, password) => {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Sign up with email and password
    signUp: async (email, password) => {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Sign out
    signOut: async () => {
        try {
            await auth.signOut();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Get current user
    getCurrentUser: () => {
        return auth.currentUser;
    },
    
    // Listen to auth state changes
    onAuthStateChanged: (callback) => {
        return auth.onAuthStateChanged(callback);
    }
};

// Firestore Database
const FirebaseDB = {
    // Add document to collection
    addDocument: async (collection, data) => {
        try {
            const docRef = await db.collection(collection).add({
                ...data,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, id: docRef.id };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Get document by ID
    getDocument: async (collection, docId) => {
        try {
            const doc = await db.collection(collection).doc(docId).get();
            if (doc.exists) {
                return { success: true, data: { id: doc.id, ...doc.data() } };
            } else {
                return { success: false, error: 'Document not found' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Update document
    updateDocument: async (collection, docId, data) => {
        try {
            await db.collection(collection).doc(docId).update({
                ...data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Delete document
    deleteDocument: async (collection, docId) => {
        try {
            await db.collection(collection).doc(docId).delete();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Get all documents from collection
    getAllDocuments: async (collection) => {
        try {
            const snapshot = await db.collection(collection).get();
            const documents = [];
            snapshot.forEach(doc => {
                documents.push({ id: doc.id, ...doc.data() });
            });
            return { success: true, data: documents };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Query documents
    queryDocuments: async (collection, field, operator, value) => {
        try {
            const snapshot = await db.collection(collection)
                .where(field, operator, value)
                .get();
            const documents = [];
            snapshot.forEach(doc => {
                documents.push({ id: doc.id, ...doc.data() });
            });
            return { success: true, data: documents };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Real-time listener
    listenToCollection: (collection, callback) => {
        return db.collection(collection).onSnapshot(snapshot => {
            const documents = [];
            snapshot.forEach(doc => {
                documents.push({ id: doc.id, ...doc.data() });
            });
            callback(documents);
        });
    }
};

// Firebase Storage
const FirebaseStorage = {
    // Upload file
    uploadFile: async (path, file, metadata = {}) => {
        try {
            const storageRef = storage.ref();
            const fileRef = storageRef.child(path);
            const snapshot = await fileRef.put(file, metadata);
            const downloadURL = await snapshot.ref.getDownloadURL();
            return { success: true, url: downloadURL };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Delete file
    deleteFile: async (path) => {
        try {
            const storageRef = storage.ref();
            const fileRef = storageRef.child(path);
            await fileRef.delete();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Get download URL
    getDownloadURL: async (path) => {
        try {
            const storageRef = storage.ref();
            const fileRef = storageRef.child(path);
            const url = await fileRef.getDownloadURL();
            return { success: true, url };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

// ===========================
// Export Firebase modules
// ===========================
window.Firebase = {
    auth: FirebaseAuth,
    db: FirebaseDB,
    storage: FirebaseStorage,
    firestore: db,
    authentication: auth,
    storageInstance: storage
};
