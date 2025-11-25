const express = require('express');
const { db } = require('../firebase-admin');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// Get applications for institution
router.get('/applications', authenticate, authorize('institution'), async (req, res) => {
  try {
    const institutionId = req.user.uid;
    console.log('📋 Fetching applications for institution:', institutionId);

    const applicationsSnapshot = await db.collection('applications')
      .where('institutionId', '==', institutionId)
      .get();

    const applications = [];
    for (const doc of applicationsSnapshot.docs) {
      const application = { id: doc.id, ...doc.data() };
      
      // Get student details
      if (application.studentId) {
        const studentDoc = await db.collection('users').doc(application.studentId).get();
        application.student = studentDoc.exists ? studentDoc.data() : null;
      }
      
      // Get course details
      if (application.courseId) {
        const courseDoc = await db.collection('courses').doc(application.courseId).get();
        application.course = courseDoc.exists ? courseDoc.data() : null;
      }

      applications.push(application);
    }

    console.log(`✅ Found ${applications.length} applications`);
    res.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Add faculty
router.post('/faculties', authenticate, authorize('institution'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const institutionId = req.user.uid;

    const facultyData = {
      name,
      description,
      institutionId,
      createdAt: new Date()
    };

    const docRef = await db.collection('faculties').add(facultyData);
    
    res.status(201).json({
      message: 'Faculty added successfully',
      facultyId: docRef.id
    });
  } catch (error) {
    console.error('Error adding faculty:', error);
    res.status(500).json({ error: 'Failed to add faculty' });
  }
});

// Get institution's faculties
router.get('/faculties', authenticate, authorize('institution'), async (req, res) => {
  try {
    const institutionId = req.user.uid;

    const facultiesSnapshot = await db.collection('faculties')
      .where('institutionId', '==', institutionId)
      .get();

    const faculties = [];
    facultiesSnapshot.forEach(doc => {
      faculties.push({ id: doc.id, ...doc.data() });
    });

    res.json(faculties);
  } catch (error) {
    console.error('Error fetching faculties:', error);
    res.status(500).json({ error: 'Failed to fetch faculties' });
  }
});

// Add course
router.post('/courses', authenticate, authorize('institution'), async (req, res) => {
  try {
    const { name, description, duration, requirements, fees, facultyId } = req.body;
    const institutionId = req.user.uid;

    const courseData = {
      name,
      description,
      duration,
      requirements: Array.isArray(requirements) ? requirements : [requirements],
      fees,
      facultyId,
      institutionId,
      createdAt: new Date(),
      isActive: true
    };

    const docRef = await db.collection('courses').add(courseData);
    
    res.status(201).json({
      message: 'Course added successfully',
      courseId: docRef.id
    });
  } catch (error) {
    console.error('Error adding course:', error);
    res.status(500).json({ error: 'Failed to add course' });
  }
});

module.exports = router;