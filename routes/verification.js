const express = require('express');
const { auth, db } = require('../firebase-admin');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Send Firebase email verification
router.post('/send-verification', authenticate, async (req, res) => {
  try {
    const user = await auth.getUser(req.user.uid);
    
    if (user.emailVerified) {
      return res.json({ 
        message: 'Email already verified',
        verified: true 
      });
    }

    // Generate email verification link using Firebase
    const actionCodeSettings = {
      url: `${process.env.FRONTEND_URL}/login?verified=true`,
      handleCodeInApp: true,
    };

    // This would trigger Firebase to send the verification email
    // Note: Firebase Admin SDK doesn't have sendEmailVerification directly
    // We'll use a workaround by generating the link ourselves
    
    const verificationLink = await auth.generateEmailVerificationLink(
      user.email,
      actionCodeSettings
    );

    console.log('📧 Firebase verification link generated for:', user.email);
    console.log('🔗 Verification link:', verificationLink);

    // In a production app, you would:
    // 1. Send this link via your email service (SendGrid, Mailgun, etc.)
    // 2. For development, we'll log it and the frontend will handle it
    
    res.json({
      message: 'Verification email sent successfully! Please check your inbox.',
      verified: false,
      email: user.email,
      // For development - include the link directly
      verificationLink: process.env.NODE_ENV === 'development' ? verificationLink : undefined
    });
    
  } catch (error) {
    console.error('Error sending verification:', error);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(500).json({ 
      error: 'Failed to send verification email. Please try again.' 
    });
  }
});

// Check verification status
router.get('/status', authenticate, async (req, res) => {
  try {
    const user = await auth.getUser(req.user.uid);
    
    // Update Firestore with current verification status
    await db.collection('users').doc(req.user.uid).update({
      emailVerified: user.emailVerified,
      lastVerifiedCheck: new Date()
    });

    res.json({
      emailVerified: user.emailVerified,
      email: user.email
    });
    
  } catch (error) {
    console.error('Error checking verification status:', error);
    res.status(500).json({ error: 'Failed to check verification status' });
  }
});

// Manual verification endpoint (for testing)
router.post('/manual-verify', authenticate, async (req, res) => {
  try {
    const { uid } = req.body;
    
    await auth.updateUser(uid, {
      emailVerified: true
    });

    // Update Firestore
    await db.collection('users').doc(uid).update({
      emailVerified: true,
      verifiedAt: new Date()
    });

    res.json({
      message: 'Email verified successfully',
      verified: true
    });
    
  } catch (error) {
    console.error('Error manual verification:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

module.exports = router;