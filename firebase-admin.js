const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
  storageBucket: `${serviceAccount.project_id}.appspot.com` 
  // Optional: Add storage if you need file uploads
  // storageBucket: `${serviceAccount.project_id}.appspot.com`
});

const db = admin.firestore();
const auth = admin.auth();
const bucket = admin.storage().bucket(); 
// Only include storage if you need file uploads
// const bucket = admin.storage().bucket();

module.exports = { admin, db, auth };