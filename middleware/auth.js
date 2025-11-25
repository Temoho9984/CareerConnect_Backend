const { auth } = require('../firebase-admin');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const authorize = (...roles) => {
  return async (req, res, next) => {
    try {
      const userDoc = await require('../firebase-admin').db
        .collection('users')
        .doc(req.user.uid)
        .get();
      
      if (!userDoc.exists || !roles.includes(userDoc.data().userType)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      req.userData = userDoc.data();
      next();
    } catch (error) {
      res.status(403).json({ error: 'Access denied' });
    }
  };
};

module.exports = { authenticate, authorize };