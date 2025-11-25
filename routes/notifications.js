const express = require('express');
const { db } = require('../firebase-admin');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Utility function to create notifications
const createNotification = async (userId, title, message, type = 'info', link = '') => {
  const notificationData = {
    userId,
    title,
    message,
    type,
    link,
    read: false,
    createdAt: new Date()
  };

  const docRef = await db.collection('notifications').add(notificationData);
  return docRef.id;
};

// Get user's notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const notificationsSnapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const notifications = [];
    notificationsSnapshot.forEach(doc => {
      notifications.push({ id: doc.id, ...doc.data() });
    });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.put('/:notificationId/read', authenticate, async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    await db.collection('notifications').doc(notificationId).update({
      read: true,
      readAt: new Date()
    });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const notificationsSnapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .where('read', '==', false)
      .get();

    const batch = db.batch();
    notificationsSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { 
        read: true, 
        readAt: new Date() 
      });
    });

    await batch.commit();

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread notification count
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const unreadSnapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .where('read', '==', false)
      .get();

    res.json({ count: unreadSnapshot.size });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = { router, createNotification };