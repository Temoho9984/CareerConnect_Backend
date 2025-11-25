const express = require('express');
const { db } = require('../firebase-admin');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// Apply for course - FIXED VERSION
router.post('/applications', authenticate, authorize('student'), async (req, res) => {
  try {
    const { courseId, institutionId } = req.body;
    const studentId = req.user.uid;

    console.log('📝 Application attempt:', { studentId, courseId, institutionId });

    // Check if course exists
    const courseDoc = await db.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) {
      return res.status(400).json({ 
        error: 'Course not found' 
      });
    }

    // Check if institution exists
    const institutionDoc = await db.collection('users').doc(institutionId).get();
    if (!institutionDoc.exists) {
      return res.status(400).json({ 
        error: 'Institution not found' 
      });
    }

    // Check if already applied to 2 courses in this institution
    const existingApplications = await db.collection('applications')
      .where('studentId', '==', studentId)
      .where('institutionId', '==', institutionId)
      .get();

    if (existingApplications.size >= 2) {
      return res.status(400).json({ 
        error: 'Cannot apply for more than 2 courses per institution' 
      });
    }

    // Check if already applied to this course
    const existingApplication = await db.collection('applications')
      .where('studentId', '==', studentId)
      .where('courseId', '==', courseId)
      .get();

    if (!existingApplication.empty) {
      return res.status(400).json({ 
        error: 'Already applied to this course' 
      });
    }

    const applicationData = {
      studentId,
      courseId,
      institutionId,
      status: 'pending',
      appliedAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('applications').add(applicationData);

    console.log('✅ Application created:', docRef.id);

    res.status(201).json({
      message: 'Application submitted successfully',
      applicationId: docRef.id,
      courseName: courseDoc.data().name,
      institutionName: institutionDoc.data().displayName
    });

  } catch (error) {
    console.error('❌ Application error:', error);
    res.status(500).json({ 
      error: 'Failed to submit application: ' + error.message 
    });
  }
});

// Get student applications - KEEP THIS (it's working)
router.get('/applications', authenticate, authorize('student'), async (req, res) => {
  try {
    const studentId = req.user.uid;
    console.log('🔍 Fetching applications for student:', studentId);

    const applicationsSnapshot = await db.collection('applications')
      .where('studentId', '==', studentId)
      .get();

    console.log(`📊 Found ${applicationsSnapshot.size} applications`);

    const applications = [];
    
    for (const doc of applicationsSnapshot.docs) {
      try {
        const application = { 
          id: doc.id, 
          ...doc.data() 
        };
        
        // Get course details
        if (application.courseId) {
          const courseDoc = await db.collection('courses').doc(application.courseId).get();
          application.course = courseDoc.exists ? { 
            id: courseDoc.id, 
            ...courseDoc.data() 
          } : null;
        } else {
          application.course = null;
        }
        
        // Get institution details
        if (application.institutionId) {
          const institutionDoc = await db.collection('users').doc(application.institutionId).get();
          application.institution = institutionDoc.exists ? { 
            id: institutionDoc.id, 
            ...institutionDoc.data() 
          } : null;
        } else {
          application.institution = null;
        }

        applications.push(application);
      } catch (docError) {
        console.error(`Error processing application ${doc.id}:`, docError);
        // Continue with other applications even if one fails
        applications.push({
          id: doc.id,
          ...doc.data(),
          course: null,
          institution: null,
          error: 'Failed to load details'
        });
      }
    }

    console.log('✅ Successfully processed applications');
    res.json(applications);
    
  } catch (error) {
    console.error('❌ Error fetching applications:', error);
    res.status(500).json({ 
      error: 'Failed to fetch applications',
      details: error.message 
    });
  }
});

// Upload transcript - FIXED VERSION
router.post('/transcripts', authenticate, authorize('student'), async (req, res) => {
  try {
    const { transcriptUrl, description } = req.body;
    const studentId = req.user.uid;

    const transcriptData = {
      studentId,
      transcriptUrl,
      description,
      uploadedAt: new Date(),
      isVerified: false
    };

    const docRef = await db.collection('transcripts').add(transcriptData);

    res.status(201).json({
      message: 'Transcript uploaded successfully',
      transcriptId: docRef.id
    });
  } catch (error) {
    console.error('Transcript upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;