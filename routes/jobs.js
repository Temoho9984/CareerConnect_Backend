const express = require('express');
const { db } = require('../firebase-admin');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get all active jobs - FIXED TIMESTAMP HANDLING
router.get('/', authenticate, async (req, res) => {
    try {
        console.log('🔍 Fetching jobs...');
        
        const jobsSnapshot = await db.collection('jobs')
            .where('isActive', '==', true)
            .get();

        console.log(`📊 Found ${jobsSnapshot.size} active jobs in database`);

        const jobs = [];
        
        for (const doc of jobsSnapshot.docs) {
            try {
                const jobData = doc.data();
                const job = {
                    id: doc.id,
                    ...jobData
                };

                console.log(`📄 Job ${doc.id}:`, job.title);
                console.log('📅 Raw deadline object:', job.deadline);

                // PROPERLY Handle Firestore timestamp conversion
                let deadlineDate;
                if (job.deadline && job.deadline.toDate) {
                    // It's a Firestore Timestamp object - use toDate() method
                    deadlineDate = job.deadline.toDate();
                    console.log(`✅ Converted using toDate(): ${deadlineDate}`);
                } else if (job.deadline && job.deadline._seconds) {
                    // It's a Firestore timestamp object (alternative format)
                    deadlineDate = new Date(job.deadline._seconds * 1000);
                    console.log(`✅ Converted using _seconds: ${deadlineDate}`);
                } else if (job.deadline instanceof Date) {
                    // It's already a Date object
                    deadlineDate = job.deadline;
                    console.log(`✅ Already a Date: ${deadlineDate}`);
                } else {
                    console.log(`❌ Unknown deadline format:`, job.deadline);
                    // Assume it's valid and continue
                    deadlineDate = new Date();
                }

                const now = new Date();
                console.log(`⏰ Job deadline: ${deadlineDate}`);
                console.log(`⏰ Current time: ${now}`);
                console.log(`📊 Deadline >= Now: ${deadlineDate >= now}`);

                // Convert for frontend display
                if (job.deadline && job.deadline.toDate) {
                    job.deadline = job.deadline.toDate().toISOString();
                } else if (job.deadline && job.deadline._seconds) {
                    job.deadline = new Date(job.deadline._seconds * 1000).toISOString();
                }

                // Convert postedAt for frontend too
                if (job.postedAt && job.postedAt.toDate) {
                    job.postedAt = job.postedAt.toDate().toISOString();
                } else if (job.postedAt && job.postedAt._seconds) {
                    job.postedAt = new Date(job.postedAt._seconds * 1000).toISOString();
                }

                // Get company details
                if (job.companyId) {
                    const companyDoc = await db.collection('users').doc(job.companyId).get();
                    job.company = companyDoc.exists ? {
                        id: companyDoc.id,
                        displayName: companyDoc.data().displayName,
                        email: companyDoc.data().email
                    } : { displayName: 'Unknown Company' };
                } else {
                    job.company = { displayName: 'Unknown Company' };
                }

                jobs.push(job);
                console.log(`✅ Added job: ${job.title}`);

            } catch (docError) {
                console.error(`❌ Error processing job ${doc.id}:`, docError);
            }
        }

        // Manual sorting by posted date (newest first)
        jobs.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));

        console.log(`🎯 Returning ${jobs.length} jobs`);
        res.json(jobs);

    } catch (error) {
        console.error('❌ Error fetching jobs:', error);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

// Debug endpoint to see raw job data
router.get('/debug', authenticate, async (req, res) => {
    try {
        console.log('🔧 Debug endpoint called');
        
        // Get ALL jobs regardless of status
        const allJobsSnapshot = await db.collection('jobs').get();
        console.log(`📊 Total jobs in database: ${allJobsSnapshot.size}`);
        
        const allJobs = [];
        allJobsSnapshot.forEach(doc => {
            const jobData = doc.data();
            console.log(`📄 Job ${doc.id}:`, {
                title: jobData.title,
                deadline: jobData.deadline,
                deadlineType: typeof jobData.deadline,
                deadlineKeys: jobData.deadline ? Object.keys(jobData.deadline) : 'null'
            });
            allJobs.push({ id: doc.id, ...jobData });
        });
        
        res.json({
            totalJobs: allJobsSnapshot.size,
            jobs: allJobs,
            message: 'Debug information'
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;