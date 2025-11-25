const express = require('express');
const { db } = require('../firebase-admin');
const router = express.Router();

// Get all courses
router.get('/', async (req, res) => {
  try {
    console.log('📚 Fetching all courses...');
    
    const coursesSnapshot = await db.collection('courses').get();
    
    if (coursesSnapshot.empty) {
      console.log('📭 No courses found in database');
      return res.json([]);
    }

    const courses = [];
    
    for (const doc of coursesSnapshot.docs) {
      try {
        const course = { 
          id: doc.id, 
          ...doc.data() 
        };
        
        console.log(`📖 Processing course: ${course.name}`);
        
        // Get institution details if institutionId exists
        if (course.institutionId) {
          try {
            const institutionDoc = await db.collection('users').doc(course.institutionId).get();
            if (institutionDoc.exists) {
              course.institution = institutionDoc.data();
              console.log(`✅ Found institution: ${course.institution.displayName}`);
            } else {
              console.log(`❌ Institution not found: ${course.institutionId}`);
              course.institution = { displayName: 'Unknown Institution' };
            }
          } catch (institutionError) {
            console.error('Error fetching institution:', institutionError);
            course.institution = { displayName: 'Unknown Institution' };
          }
        } else {
          course.institution = { displayName: 'No Institution' };
        }
        
        // Get faculty details if facultyId exists
        if (course.facultyId) {
          try {
            const facultyDoc = await db.collection('faculties').doc(course.facultyId).get();
            course.faculty = facultyDoc.exists ? facultyDoc.data() : null;
          } catch (facultyError) {
            console.error('Error fetching faculty:', facultyError);
            course.faculty = null;
          }
        }
        
        courses.push(course);
      } catch (docError) {
        console.error(`Error processing course ${doc.id}:`, docError);
        // Continue with other courses even if one fails
      }
    }

    console.log(`✅ Successfully loaded ${courses.length} courses`);
    res.json(courses);
    
  } catch (error) {
    console.error('❌ Error fetching courses:', error);
    res.status(500).json({ 
      error: 'Failed to fetch courses',
      details: error.message 
    });
  }
});

// Get courses by institution
router.get('/institution/:institutionId', async (req, res) => {
  try {
    const { institutionId } = req.params;
    
    const coursesSnapshot = await db.collection('courses')
      .where('institutionId', '==', institutionId)
      .get();

    const courses = [];
    coursesSnapshot.forEach(doc => {
      courses.push({ id: doc.id, ...doc.data() });
    });

    res.json(courses);
  } catch (error) {
    console.error('Error fetching institution courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get single course by ID
router.get('/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const courseDoc = await db.collection('courses').doc(courseId).get();
    
    if (!courseDoc.exists) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = { id: courseDoc.id, ...courseDoc.data() };
    
    // Get institution details
    if (course.institutionId) {
      const institutionDoc = await db.collection('users').doc(course.institutionId).get();
      course.institution = institutionDoc.exists ? institutionDoc.data() : null;
    }
    
    res.json(course);
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

module.exports = router;