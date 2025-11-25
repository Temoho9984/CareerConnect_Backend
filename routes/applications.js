const express = require('express');
const { db } = require('../firebase-admin');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
const { createNotification } = require('./notifications');

// Get applications for institution
router.get('/institution', authenticate, authorize('institution'), async (req, res) => {
  try {
    const institutionId = req.user.uid;

    const applicationsSnapshot = await db.collection('applications')
      .where('institutionId', '==', institutionId)
      .get();

    const applications = [];
    for (const doc of applicationsSnapshot.docs) {
      const application = { id: doc.id, ...doc.data() };
      
      // Get student details
      const studentDoc = await db.collection('users').doc(application.studentId).get();
      application.student = studentDoc.exists ? studentDoc.data() : null;
      
      // Get course details
      const courseDoc = await db.collection('courses').doc(application.courseId).get();
      application.course = courseDoc.exists ? courseDoc.data() : null;

      applications.push(application);
    }

    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update application status
router.put('/:applicationId/status', authenticate, authorize('institution'), async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;

    if (!['pending', 'admitted', 'rejected', 'waiting-list'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await db.collection('applications').doc(applicationId).update({
      status,
      updatedAt: new Date()
    });

    res.json({ message: 'Application status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:applicationId/status', authenticate, authorize('institution'), async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;

    if (!['pending', 'admitted', 'rejected', 'waiting-list'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get application details
    const applicationDoc = await db.collection('applications').doc(applicationId).get();
    if (!applicationDoc.exists) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const application = applicationDoc.data();
    
    // Update application status
    await db.collection('applications').doc(applicationId).update({
      status,
      updatedAt: new Date()
    });

    // Send notification to student
    let message = '';
    switch (status) {
      case 'admitted':
        message = `Congratulations! You've been admitted to the program.`;
        break;
      case 'rejected':
        message = `Your application has been reviewed. Check your status for details.`;
        break;
      case 'waiting-list':
        message = `You've been placed on the waiting list for the program.`;
        break;
      default:
        message = `Your application status has been updated.`;
    }

    await createNotification(
      application.studentId,
      'Application Status Update',
      message,
      'info',
      `/student/applications`
    );

    res.json({ message: 'Application status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;