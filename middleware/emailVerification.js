const { auth } = require('../firebase-admin');

const requireVerifiedEmail = async (req, res, next) => {
  try {
    const user = await auth.getUser(req.user.uid);
    
    if (!user.emailVerified) {
      return res.status(403).json({ 
        error: 'Email not verified. Please verify your email before accessing this resource.' 
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error verifying email status' });
  }
};

module.exports = { requireVerifiedEmail };