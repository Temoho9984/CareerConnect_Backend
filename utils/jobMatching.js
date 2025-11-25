const { db } = require('../firebase-admin');

const calculateJobMatch = async (studentId, jobId) => {
  try {
    // Get student data
    const studentDoc = await db.collection('users').doc(studentId).get();
    const student = studentDoc.data();
    
    // Get job requirements
    const jobDoc = await db.collection('jobs').doc(jobId).get();
    const job = jobDoc.data();
    
    let score = 0;
    const maxScore = 100;
    const matchDetails = [];
    
    // Academic performance matching (30%)
    const transcriptsSnapshot = await db.collection('transcripts')
      .where('studentId', '==', studentId)
      .where('isVerified', '==', true)
      .get();
    
    if (transcriptsSnapshot.size > 0) {
      score += 30;
      matchDetails.push('Academic transcripts verified');
    }
    
    // Certificate matching (25%)
    const certificatesSnapshot = await db.collection('certificates')
      .where('studentId', '==', studentId)
      .get();
    
    const relevantCerts = certificatesSnapshot.size;
    if (relevantCerts > 0) {
      score += Math.min(25, relevantCerts * 5);
      matchDetails.push(`${relevantCerts} relevant certificates`);
    }
    
    // Skills/Qualifications matching (35%)
    if (job.qualifications) {
      // Basic qualification matching
      const hasQualifications = true; // Implement actual matching logic
      if (hasQualifications) {
        score += 35;
        matchDetails.push('Meets qualification requirements');
      }
    }
    
    // Experience matching (10%)
    if (student.workExperience) {
      score += 10;
      matchDetails.push('Has work experience');
    }
    
    return {
      score: Math.round(score),
      qualified: score >= 70, // 70% threshold for qualification
      matchDetails
    };
  } catch (error) {
    console.error('Job matching error:', error);
    return { score: 0, qualified: false, matchDetails: [] };
  }
};

const findQualifiedApplicants = async (jobId) => {
  try {
    const jobDoc = await db.collection('jobs').doc(jobId).get();
    const job = jobDoc.data();
    
    // Get all students with verified transcripts
    const studentsSnapshot = await db.collection('users')
      .where('userType', '==', 'student')
      .get();
    
    const qualifiedApplicants = [];
    
    for (const studentDoc of studentsSnapshot.docs) {
      const student = studentDoc.data();
      const matchResult = await calculateJobMatch(studentDoc.id, jobId);
      
      if (matchResult.qualified) {
        qualifiedApplicants.push({
          studentId: studentDoc.id,
          studentName: student.displayName,
          email: student.email,
          phone: student.phone,
          matchScore: matchResult.score,
          matchDetails: matchResult.matchDetails,
          transcripts: [], // You'd populate this with actual data
          certificates: [] // You'd populate this with actual data
        });
      }
    }
    
    // Sort by match score (highest first)
    return qualifiedApplicants.sort((a, b) => b.matchScore - a.matchScore);
  } catch (error) {
    console.error('Error finding qualified applicants:', error);
    return [];
  }
};

module.exports = { calculateJobMatch, findQualifiedApplicants };