const express = require('express');
const { auth, db } = require('../firebase-admin');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// User registration - UPDATED (No password in backend)
router.post('/register', async (req, res) => {
  try {
    const { uid, email, userType, displayName, phone, institutionName, companyName } = req.body;

    console.log('📝 Creating Firestore document for:', email, 'UID:', uid);

    // Validate required fields (NO PASSWORD NEEDED)
    if (!uid || !email || !userType) {
      return res.status(400).json({ 
        error: 'Missing required fields: uid, email, userType' 
      });
    }

    // Check if user already exists in Firestore
    const existingUser = await db.collection('users').doc(uid).get();
    if (existingUser.exists) {
      console.log('ℹ️ User already exists in Firestore:', uid);
      return res.json({
        message: 'User already exists in Firestore',
        uid: uid,
        exists: true,
        success: true
      });
    }

    // Determine display name
    let actualDisplayName = displayName;
    if (!actualDisplayName) {
      if (institutionName) {
        actualDisplayName = institutionName;
      } else if (companyName) {
        actualDisplayName = companyName;
      } else {
        actualDisplayName = email.split('@')[0];
      }
    }

    console.log('🎯 Using display name:', actualDisplayName);

    // Create user data for Firestore
    const userData = {
      uid: uid,
      email: email,
      userType: userType,
      displayName: actualDisplayName,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      emailVerified: false
    };

    // Add type-specific fields
    if (userType === 'student') {
      userData.phone = phone || '';
      userData.applications = [];
      userData.transcripts = [];
      userData.certificates = [];
    } else if (userType === 'institution') {
      userData.institutionName = institutionName || '';
      userData.phone = phone || '';
      userData.isVerified = false;
    } else if (userType === 'company') {
      userData.companyName = companyName || '';
      userData.phone = phone || '';
      userData.isVerified = false;
    } else if (userType === 'admin') {
      userData.isSuperAdmin = true;
    }

    // Save to Firestore
    await db.collection('users').doc(uid).set(userData);

    console.log('✅ Firestore document created for:', email);

    res.status(201).json({
      message: 'User profile created successfully',
      uid: uid,
      userType: userType,
      displayName: actualDisplayName,
      email: email,
      success: true
    });

  } catch (error) {
    console.error('❌ Firestore creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create user profile: ' + error.message,
      success: false
    });
  }
});

// Get current user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    console.log('🔍 Fetching profile for user:', req.user.uid);
    
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      console.log('❌ User document not found in Firestore');
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userData = userDoc.data();
    console.log('✅ Found user profile:', userData.email);
    
    res.json(userData);
    
  } catch (error) {
    console.error('❌ Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile: ' + error.message });
  }
});

module.exports = router;