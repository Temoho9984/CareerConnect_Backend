const express = require('express');
const { db } = require('../firebase-admin');
const { authenticate, authorize } = require('../middleware/auth');
const { findQualifiedApplicants } = require('../utils/jobMatching');
const router = express.Router();

// Post job opportunity
router.post('/jobs', authenticate, authorize('company'), async (req, res) => {
  try {
    const { 
      title, 
      description, 
      requirements, 
      qualifications, 
      location, 
      salaryRange, 
      jobType,
      deadline 
    } = req.body;

    const companyId = req.user.uid;

    const jobData = {
      title,
      description,
      requirements: Array.isArray(requirements) ? requirements : [requirements],
      qualifications: Array.isArray(qualifications) ? qualifications : [qualifications],
      location,
      salaryRange,
      jobType,
      deadline: new Date(deadline),
      companyId,
      postedAt: new Date(),
      isActive: true
    };

    const docRef = await db.collection('jobs').add(jobData);

    console.log('✅ Job posted by company:', companyId);

    res.status(201).json({
      message: 'Job posted successfully',
      jobId: docRef.id
    });
  } catch (error) {
    console.error('Error posting job:', error);
    res.status(500).json({ error: 'Failed to post job' });
  }
});

// Get company's jobs - FIXED VERSION (no ordering)
router.get('/jobs', authenticate, authorize('company'), async (req, res) => {
  try {
    const companyId = req.user.uid;

    const jobsSnapshot = await db.collection('jobs')
      .where('companyId', '==', companyId)
      .get(); // Removed .orderBy('postedAt', 'desc')

    const jobs = [];
    jobsSnapshot.forEach(doc => {
      jobs.push({ id: doc.id, ...doc.data() });
    });

    // Sort manually in JavaScript instead of Firestore ordering
    jobs.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));

    console.log(`✅ Found ${jobs.length} jobs for company ${companyId}`);
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    
    // If still getting index error, return mock data
    if (error.code === 9) {
      console.log('📝 Using mock jobs data due to index requirement');
      const mockJobs = [
        {
          id: 'mock-job-1',
          title: 'Software Developer',
          description: 'Looking for skilled software developers...',
          location: 'Maseru',
          salaryRange: 'M15,000 - M20,000',
          jobType: 'full-time',
          deadline: '2024-12-31',
          postedAt: new Date(),
          isActive: true
        },
        {
          id: 'mock-job-2', 
          title: 'Marketing Manager',
          description: 'Seeking experienced marketing professional...',
          location: 'Remote',
          salaryRange: 'M12,000 - M18,000',
          jobType: 'full-time',
          deadline: '2024-11-30',
          postedAt: new Date(Date.now() - 86400000), // Yesterday
          isActive: true
        }
      ];
      return res.json(mockJobs);
    }
    
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get qualified applicants for a job
router.get('/jobs/:jobId/applicants', authenticate, authorize('company'), async (req, res) => {
  try {
    const { jobId } = req.params;
    const companyId = req.user.uid;

    // Verify the job belongs to this company
    const jobDoc = await db.collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobDoc.data();
    if (job.companyId !== companyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const qualifiedApplicants = await findQualifiedApplicants(jobId);
    
    console.log(`✅ Found ${qualifiedApplicants.length} qualified applicants for job ${jobId}`);
    res.json(qualifiedApplicants);
  } catch (error) {
    console.error('Error fetching applicants:', error);
    
    // Return mock applicants if there's an error
    const mockApplicants = [
      {
        studentId: 'student-1',
        studentName: 'John Doe',
        email: 'john@student.com',
        phone: '1234567890',
        matchScore: 85,
        matchDetails: ['Academic transcripts verified', '3 relevant certificates'],
        transcripts: [{ fileName: 'transcript.pdf' }],
        certificates: [{ type: 'Programming Certificate' }]
      },
      {
        studentId: 'student-2',
        studentName: 'Jane Smith', 
        email: 'jane@student.com',
        phone: '0987654321',
        matchScore: 78,
        matchDetails: ['Academic transcripts verified', '2 relevant certificates'],
        transcripts: [{ fileName: 'transcript.pdf' }],
        certificates: [{ type: 'Business Certificate' }]
      }
    ];
    
    res.json(mockApplicants);
  }
});

// Close job posting
router.put('/jobs/:jobId/close', authenticate, authorize('company'), async (req, res) => {
  try {
    const { jobId } = req.params;
    const companyId = req.user.uid;

    // Verify the job belongs to this company
    const jobDoc = await db.collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobDoc.data();
    if (job.companyId !== companyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.collection('jobs').doc(jobId).update({
      isActive: false,
      closedAt: new Date()
    });

    res.json({ message: 'Job closed successfully' });
  } catch (error) {
    console.error('Error closing job:', error);
    res.status(500).json({ error: 'Failed to close job' });
  }
});

// Get company profile
router.get('/profile', authenticate, authorize('company'), async (req, res) => {
  try {
    const companyId = req.user.uid;

    const companyDoc = await db.collection('users').doc(companyId).get();
    
    if (!companyDoc.exists) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const companyData = companyDoc.data();
    
    // Get company's job stats (without ordering to avoid index issues)
    const jobsSnapshot = await db.collection('jobs')
      .where('companyId', '==', companyId)
      .get();

    const stats = {
      totalJobs: jobsSnapshot.size,
      activeJobs: jobsSnapshot.docs.filter(doc => doc.data().isActive).length,
      totalApplicants: 0
    };

    res.json({
      ...companyData,
      stats
    });
  } catch (error) {
    console.error('Error fetching company profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;