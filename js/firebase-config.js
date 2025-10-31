// ===========================
// Firebase Configuration
// ===========================

// Firebase configuration object
const firebaseConfig = {
    apiKey: "AIzaSyDrZMtOLrTLOwnjAyY6lhjI73ftkPIIyJg",
    authDomain: "vendly-7e566.firebaseapp.com",
    databaseURL: "https://vendly-7e566-default-rtdb.firebaseio.com", // Add this for Realtime Database
    projectId: "vendly-7e566",
    storageBucket: "vendly-7e566.firebasestorage.app",
    messagingSenderId: "736329773393",
    appId: "1:736329773393:web:4fcff1e7117fc55d21e370",
    measurementId: "G-ENHRRHHP7Q"
};

// Initialize Firebase
let database = null; // Realtime Database
let auth = null;
let storage = null;

try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database(); // Initialize Realtime Database
    auth = firebase.auth();
    storage = firebase.storage();
    
    console.log('✅ Firebase initialized successfully');
    console.log('🔥 Realtime Database connected');
    console.log('📍 Database URL:', firebaseConfig.databaseURL);
    
    // Test database connection
    database.ref('.info/connected').on('value', (snapshot) => {
        if (snapshot.val() === true) {
            console.log('✅ Connected to Firebase Realtime Database');
        } else {
            console.log('❌ Disconnected from Firebase Realtime Database');
        }
    });
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
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

// Realtime Database Helper Functions
const FirebaseDB = {
    // Add data to a path (push creates unique ID)
    addData: async (path, data) => {
        try {
            const ref = database.ref(path);
            const newRef = ref.push();
            await newRef.set({
                ...data,
                id: newRef.key,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            return { success: true, id: newRef.key };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Set data at a specific path (overwrites)
    setData: async (path, data) => {
        try {
            await database.ref(path).set({
                ...data,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Get data from a path
    getData: async (path) => {
        try {
            const snapshot = await database.ref(path).once('value');
            if (snapshot.exists()) {
                return { success: true, data: snapshot.val() };
            } else {
                return { success: false, error: 'Data not found' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Update data at a path (merges with existing data)
    updateData: async (path, data) => {
        try {
            await database.ref(path).update({
                ...data,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Delete data at a path
    deleteData: async (path) => {
        try {
            await database.ref(path).remove();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Get all items from a path
    getAllData: async (path) => {
        try {
            const snapshot = await database.ref(path).once('value');
            const data = [];
            snapshot.forEach(childSnapshot => {
                data.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            return { success: true, data: data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Query data (orderBy, limitTo, startAt, endAt, equalTo)
    queryData: async (path, orderByField, limitCount = null, startAtValue = null, equalToValue = null) => {
        try {
            let ref = database.ref(path);
            
            if (orderByField) {
                ref = ref.orderByChild(orderByField);
            }
            
            if (equalToValue !== null) {
                ref = ref.equalTo(equalToValue);
            }
            
            if (startAtValue !== null) {
                ref = ref.startAt(startAtValue);
            }
            
            if (limitCount) {
                ref = ref.limitToFirst(limitCount);
            }
            
            const snapshot = await ref.once('value');
            const data = [];
            snapshot.forEach(childSnapshot => {
                data.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            return { success: true, data: data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Real-time listener for a path
    listenToPath: (path, callback) => {
        const ref = database.ref(path);
        ref.on('value', (snapshot) => {
            if (snapshot.exists()) {
                const data = [];
                snapshot.forEach(childSnapshot => {
                    data.push({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });
                callback(data);
            } else {
                callback([]);
            }
        });
        return () => ref.off('value');
    },
    
    // Listen to child added
    listenToChildAdded: (path, callback) => {
        const ref = database.ref(path);
        ref.on('child_added', (snapshot) => {
            callback({
                id: snapshot.key,
                ...snapshot.val()
            });
        });
        return () => ref.off('child_added');
    },
    
    // Listen to child changed
    listenToChildChanged: (path, callback) => {
        const ref = database.ref(path);
        ref.on('child_changed', (snapshot) => {
            callback({
                id: snapshot.key,
                ...snapshot.val()
            });
        });
        return () => ref.off('child_changed');
    },
    
    // Listen to child removed
    listenToChildRemoved: (path, callback) => {
        const ref = database.ref(path);
        ref.on('child_removed', (snapshot) => {
            callback(snapshot.key);
        });
        return () => ref.off('child_removed');
    },
    
    // Transaction (for atomic operations like counters)
    runTransaction: async (path, updateFunction) => {
        try {
            const result = await database.ref(path).transaction(updateFunction);
            return { success: true, data: result.snapshot.val() };
        } catch (error) {
            return { success: false, error: error.message };
        }
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
    database: database, // Realtime Database instance
    authentication: auth,
    storageInstance: storage
};
