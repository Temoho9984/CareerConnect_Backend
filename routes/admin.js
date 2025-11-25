const express = require('express');
const { db } = require('../firebase-admin');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// Get admin dashboard stats
router.get('/stats', authenticate, authorize('admin'), async (req, res) => {
    try {
        // Get all users count by type
        const studentsSnapshot = await db.collection('users').where('userType', '==', 'student').get();
        const companiesSnapshot = await db.collection('users').where('userType', '==', 'company').get();
        const institutionsSnapshot = await db.collection('users').where('userType', '==', 'institution').get();
        
        // Get jobs and applications count
        const jobsSnapshot = await db.collection('jobs').get();
        const applicationsSnapshot = await db.collection('applications').get();
        const jobApplicationsSnapshot = await db.collection('jobApplications').get();
        
        // Get courses count
        const coursesSnapshot = await db.collection('courses').get();

        res.json({
            stats: {
                students: studentsSnapshot.size,
                companies: companiesSnapshot.size,
                institutions: institutionsSnapshot.size,
                jobs: jobsSnapshot.size,
                courseApplications: applicationsSnapshot.size,
                jobApplications: jobApplicationsSnapshot.size,
                courses: coursesSnapshot.size
            }
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Get all institutions
router.get('/institutions', authenticate, authorize('admin'), async (req, res) => {
    try {
        const institutionsSnapshot = await db.collection('users')
            .where('userType', '==', 'institution')
            .get();
        
        const institutions = [];
        institutionsSnapshot.forEach(doc => {
            institutions.push({ id: doc.id, ...doc.data() });
        });

        res.json(institutions);
    } catch (error) {
        console.error('Error fetching institutions:', error);
        res.status(500).json({ error: 'Failed to fetch institutions' });
    }
});

// Get all companies
router.get('/companies', authenticate, authorize('admin'), async (req, res) => {
    try {
        const companiesSnapshot = await db.collection('users')
            .where('userType', '==', 'company')
            .get();
        
        const companies = [];
        companiesSnapshot.forEach(doc => {
            companies.push({ id: doc.id, ...doc.data() });
        });

        res.json(companies);
    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({ error: 'Failed to fetch companies' });
    }
});

// Get all courses
router.get('/courses', authenticate, authorize('admin'), async (req, res) => {
    try {
        const coursesSnapshot = await db.collection('courses').get();
        
        const courses = [];
        for (const doc of coursesSnapshot.docs) {
            const course = { id: doc.id, ...doc.data() };
            
            // Get institution details
            if (course.institutionId) {
                const institutionDoc = await db.collection('users').doc(course.institutionId).get();
                course.institution = institutionDoc.exists ? institutionDoc.data() : null;
            }
            
            courses.push(course);
        }

        res.json(courses);
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

// Add new institution
router.post('/institutions', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { email, password, institutionName, phone, address } = req.body;

        // Check if institution already exists
        const existingInstitution = await db.collection('users')
            .where('email', '==', email)
            .get();

        if (!existingInstitution.empty) {
            return res.status(400).json({ error: 'Institution with this email already exists' });
        }

        // Create institution in Firebase Auth (you'll need to implement this)
        // For now, we'll just create the user document
        const institutionData = {
            email,
            displayName: institutionName,
            institutionName,
            phone: phone || '',
            address: address || '',
            userType: 'institution',
            createdAt: new Date(),
            status: 'active'
        };

        const docRef = await db.collection('users').add(institutionData);

        res.status(201).json({
            message: 'Institution created successfully',
            institutionId: docRef.id
        });
    } catch (error) {
        console.error('Error creating institution:', error);
        res.status(500).json({ error: 'Failed to create institution' });
    }
});

// Add new course
router.post('/courses', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { name, description, duration, fees, requirements, institutionId, faculty } = req.body;

        const courseData = {
            name,
            description: description || '',
            duration: duration || '',
            fees: fees || '',
            requirements: Array.isArray(requirements) ? requirements : [requirements],
            institutionId,
            faculty: faculty || '',
            createdAt: new Date(),
            isActive: true
        };

        const docRef = await db.collection('courses').add(courseData);

        res.status(201).json({
            message: 'Course created successfully',
            courseId: docRef.id
        });
    } catch (error) {
        console.error('Error creating course:', error);
        res.status(500).json({ error: 'Failed to create course' });
    }
});

// Update institution status
router.put('/institutions/:institutionId/status', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { institutionId } = req.params;
        const { status } = req.body;

        if (!['active', 'suspended'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        await db.collection('users').doc(institutionId).update({
            status,
            updatedAt: new Date()
        });

        res.json({ message: 'Institution status updated successfully' });
    } catch (error) {
        console.error('Error updating institution status:', error);
        res.status(500).json({ error: 'Failed to update institution status' });
    }
});

// Update company status
router.put('/companies/:companyId/status', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { companyId } = req.params;
        const { status } = req.body;

        if (!['active', 'suspended', 'pending'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        await db.collection('users').doc(companyId).update({
            status,
            updatedAt: new Date()
        });

        res.json({ message: 'Company status updated successfully' });
    } catch (error) {
        console.error('Error updating company status:', error);
        res.status(500).json({ error: 'Failed to update company status' });
    }
});

// Delete institution
router.delete('/institutions/:institutionId', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { institutionId } = req.params;

        // Check if institution has courses
        const coursesSnapshot = await db.collection('courses')
            .where('institutionId', '==', institutionId)
            .get();

        if (!coursesSnapshot.empty) {
            return res.status(400).json({ error: 'Cannot delete institution with existing courses' });
        }

        await db.collection('users').doc(institutionId).delete();

        res.json({ message: 'Institution deleted successfully' });
    } catch (error) {
        console.error('Error deleting institution:', error);
        res.status(500).json({ error: 'Failed to delete institution' });
    }
});

// Delete course
router.delete('/courses/:courseId', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { courseId } = req.params;

        // Check if course has applications
        const applicationsSnapshot = await db.collection('applications')
            .where('courseId', '==', courseId)
            .get();

        if (!applicationsSnapshot.empty) {
            return res.status(400).json({ error: 'Cannot delete course with existing applications' });
        }

        await db.collection('courses').doc(courseId).delete();

        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        console.error('Error deleting course:', error);
        res.status(500).json({ error: 'Failed to delete course' });
    }
});

// Get system reports
router.get('/reports', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { period = 'month' } = req.query; // day, week, month, year
        
        // Get recent user registrations
        const usersSnapshot = await db.collection('users')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const recentUsers = [];
        usersSnapshot.forEach(doc => {
            recentUsers.push({ id: doc.id, ...doc.data() });
        });

        // Get recent applications
        const applicationsSnapshot = await db.collection('applications')
            .orderBy('appliedAt', 'desc')
            .limit(50)
            .get();

        const recentApplications = [];
        applicationsSnapshot.forEach(doc => {
            recentApplications.push({ id: doc.id, ...doc.data() });
        });

        // Get recent job applications
        const jobApplicationsSnapshot = await db.collection('jobApplications')
            .orderBy('appliedAt', 'desc')
            .limit(50)
            .get();

        const recentJobApplications = [];
        jobApplicationsSnapshot.forEach(doc => {
            recentJobApplications.push({ id: doc.id, ...doc.data() });
        });

        res.json({
            recentUsers,
            recentApplications,
            recentJobApplications,
            generatedAt: new Date()
        });
    } catch (error) {
        console.error('Error generating reports:', error);
        res.status(500).json({ error: 'Failed to generate reports' });
    }
});

module.exports = router;