const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

const setupAdminAccount = async () => {
  const adminEmail = 'admin@careerplatform.com';
  const adminPassword = 'Admin123!';

  try {
    // Check if admin user already exists
    try {
      const userRecord = await auth.getUserByEmail(adminEmail);
      console.log('✅ Admin account already exists:', userRecord.uid);
      
      // Check if Firestore document exists
      const userDoc = await db.collection('users').doc(userRecord.uid).get();
      if (!userDoc.exists) {
        console.log('⚠️  Creating missing Firestore document...');
        await db.collection('users').doc(userRecord.uid).set({
          email: adminEmail,
          displayName: 'System Administrator',
          userType: 'admin',
          createdAt: new Date(),
          status: 'active',
          isAdmin: true
        });
        console.log('✅ Firestore document created');
      }
      
      console.log('\n📧 Existing Admin Credentials:');
      console.log('Email:', adminEmail);
      console.log('Password: [Use existing password]');
      console.log('User ID:', userRecord.uid);
      
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create new admin account
        console.log('🆕 Creating new admin account...');
        
        const userRecord = await auth.createUser({
          email: adminEmail,
          password: adminPassword,
          displayName: 'System Administrator',
          emailVerified: true
        });

        await db.collection('users').doc(userRecord.uid).set({
          email: adminEmail,
          displayName: 'System Administrator',
          userType: 'admin',
          createdAt: new Date(),
          status: 'active',
          isAdmin: true
        });

        console.log('✅ New admin account created successfully!');
        console.log('\n📧 New Admin Credentials:');
        console.log('Email:', adminEmail);
        console.log('Password:', adminPassword);
        console.log('User ID:', userRecord.uid);
      } else {
        throw error;
      }
    }

  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    process.exit();
  }
};

setupAdminAccount();