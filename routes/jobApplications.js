const express = require('express');
const { db } = require('../firebase-admin'); // Import from your firebase-admin setup
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// Apply for job - FIXED VERSION
router.post('/apply', authenticate, authorize('student'), async (req, res) => {
    try {
        const { jobId, coverLetter } = req.body;
        const studentId = req.user.uid;

        console.log('🎯 Job application attempt', { studentId, jobId });

        // Get student profile
        const studentDoc = await db.collection('users').doc(studentId).get();
        if (!studentDoc.exists) {
            return res.status(404).json({ error: 'Student profile not found' });
        }

        const student = studentDoc.data();

        // Try to get job details if job exists
        let companyId = 'temp-company';
        let jobTitle = 'Unknown Job';
        
        try {
            const jobDoc = await db.collection('jobs').doc(jobId).get();
            if (jobDoc.exists) {
                const job = jobDoc.data();
                companyId = job.companyId;
                jobTitle = job.title;
                console.log('✅ Found job details:', jobTitle);
            } else {
                console.log('⚠️ Job not found, using temporary data');
            }
        } catch (jobError) {
            console.log('⚠️ Could not fetch job details, continuing anyway');
        }

        // Create application
        const applicationData = {
            studentId,
            jobId,
            companyId: companyId,
            studentName: student.displayName,
            studentEmail: student.email,
            studentPhone: student.phone || 'Not provided',
            coverLetter: coverLetter || '',
            status: 'pending',
            appliedAt: new Date(),
            updatedAt: new Date()
        };

        const docRef = await db.collection('jobApplications').add(applicationData);

        // Update student's job applications array using arrayUnion
        // FIX: Use FieldValue.arrayUnion properly
        const { FieldValue } = require('firebase-admin/firestore');
        await db.collection('users').doc(studentId).update({
            jobApplications: FieldValue.arrayUnion(docRef.id)
        });

        // Update job's applications count if job exists
        if (companyId !== 'temp-company') {
            try {
                await db.collection('jobs').doc(jobId).update({
                    applicationsCount: FieldValue.increment(1)
                });
                console.log('✅ Updated job applications count');
            } catch (countError) {
                console.log('⚠️ Could not update job applications count');
            }
        }

        console.log('✅ Job application created:', docRef.id);
        res.status(201).json({
            message: 'Job application submitted successfully!',
            applicationId: docRef.id
        });

    } catch (error) {
        console.error('❌ Job application error:', error);
        res.status(500).json({ error: 'Failed to submit job application: ' + error.message });
    }
});

// Get student's job applications
router.get('/my-applications', authenticate, authorize('student'), async (req, res) => {
    try {
        const studentId = req.user.uid;
        console.log('🔍 Looking for job applications for student:', studentId);

        const applicationsSnapshot = await db.collection('jobApplications')
            .where('studentId', '==', studentId)
            .get();

        console.log(`📝 Found ${applicationsSnapshot.size} applications for student ${studentId}`);

        const applications = [];
        
        for (const doc of applicationsSnapshot.docs) {
            try {
                const application = {
                    id: doc.id,
                    ...doc.data()
                };

                // Get job details if job exists
                if (application.jobId) {
                    try {
                        const jobDoc = await db.collection('jobs').doc(application.jobId).get();
                        application.job = jobDoc.exists ? { 
                            id: jobDoc.id, 
                            ...jobDoc.data() 
                        } : { title: 'Job Not Found' };
                    } catch (jobError) {
                        application.job = { title: 'Error loading job' };
                    }
                } else {
                    application.job = { title: 'Unknown Job' };
                }

                // Get company details if company exists
                if (application.companyId && application.companyId !== 'temp-company') {
                    try {
                        const companyDoc = await db.collection('users').doc(application.companyId).get();
                        application.company = companyDoc.exists ? {
                            id: companyDoc.id,
                            ...companyDoc.data()
                        } : { displayName: 'Unknown Company' };
                    } catch (companyError) {
                        application.company = { displayName: 'Error loading company' };
                    }
                } else {
                    application.company = { displayName: 'Unknown Company' };
                }

                applications.push(application);
            } catch (docError) {
                console.error(`❌ Error processing application ${doc.id}:`, docError);
                applications.push({
                    id: doc.id,
                    error: 'Failed to load application details',
                    job: { title: 'Error' },
                    company: { displayName: 'Error' }
                });
            }
        }

        // Sort by application date (newest first)
        applications.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

        console.log(`✅ Successfully processed ${applications.length} applications`);
        res.json(applications);

    } catch (error) {
        console.error('❌ Error fetching job applications:', error);
        res.status(500).json({ error: 'Failed to fetch job applications' });
    }
});

// Withdraw job application
router.delete('/:applicationId', authenticate, authorize('student'), async (req, res) => {
    try {
        const { applicationId } = req.params;
        const studentId = req.user.uid;

        // Verify the application belongs to the student
        const applicationDoc = await db.collection('jobApplications').doc(applicationId).get();
        if (!applicationDoc.exists) {
            return res.status(404).json({ error: 'Application not found' });
        }

        const application = applicationDoc.data();
        if (application.studentId !== studentId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await db.collection('jobApplications').doc(applicationId).delete();

        // Remove from student's applications array
        const { FieldValue } = require('firebase-admin/firestore');
        await db.collection('users').doc(studentId).update({
            jobApplications: FieldValue.arrayRemove(applicationId)
        });

        // Decrement job applications count if job exists
        if (application.jobId && application.companyId !== 'temp-company') {
            try {
                await db.collection('jobs').doc(application.jobId).update({
                    applicationsCount: FieldValue.increment(-1)
                });
            } catch (countError) {
                console.log('⚠️ Could not update job applications count');
            }
        }

        console.log('✅ Application withdrawn:', applicationId);
        res.json({ message: 'Application withdrawn successfully' });

    } catch (error) {
        console.error('❌ Error withdrawing application:', error);
        res.status(500).json({ error: 'Failed to withdraw application' });
    }
});

module.exports = router;