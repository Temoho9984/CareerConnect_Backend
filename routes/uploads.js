const express = require('express');
const multer = require('multer');
const { db, bucket } = require('../firebase-admin');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed!'), false);
    }
  },
});

// Upload transcript
router.post('/transcript', authenticate, authorize('student'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const studentId = req.user.uid;
    const fileName = `transcripts/${studentId}/${Date.now()}_${req.file.originalname}`;
    
    // Upload to Firebase Storage
    const file = bucket.file(fileName);
    const stream = file.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    stream.on('error', (error) => {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    });

    stream.on('finish', async () => {
      // Make file publicly accessible
      await file.makePublic();
      
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      
      // Save to Firestore
      const transcriptData = {
        studentId,
        transcriptUrl: publicUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        uploadedAt: new Date(),
        isVerified: false,
        description: req.body.description || ''
      };

      const docRef = await db.collection('transcripts').add(transcriptData);
      
      // Update student's transcripts array
      await db.collection('users').doc(studentId).update({
        transcripts: admin.firestore.FieldValue.arrayUnion(docRef.id)
      });

      res.status(201).json({
        message: 'Transcript uploaded successfully',
        transcriptId: docRef.id,
        url: publicUrl
      });
    });

    stream.end(req.file.buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload certificate
router.post('/certificate', authenticate, authorize('student'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const studentId = req.user.uid;
    const fileName = `certificates/${studentId}/${Date.now()}_${req.file.originalname}`;
    
    const file = bucket.file(fileName);
    const stream = file.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    stream.on('error', (error) => {
      res.status(500).json({ error: 'Upload failed' });
    });

    stream.on('finish', async () => {
      await file.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      
      const certificateData = {
        studentId,
        certificateUrl: publicUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        uploadedAt: new Date(),
        type: req.body.type || 'other',
        description: req.body.description || ''
      };

      const docRef = await db.collection('certificates').add(certificateData);
      
      await db.collection('users').doc(studentId).update({
        certificates: admin.firestore.FieldValue.arrayUnion(docRef.id)
      });

      res.status(201).json({
        message: 'Certificate uploaded successfully',
        certificateId: docRef.id,
        url: publicUrl
      });
    });

    stream.end(req.file.buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get student's transcripts
router.get('/transcripts', authenticate, authorize('student'), async (req, res) => {
  try {
    const studentId = req.user.uid;
    const transcriptsSnapshot = await db.collection('transcripts')
      .where('studentId', '==', studentId)
      .orderBy('uploadedAt', 'desc')
      .get();

    const transcripts = [];
    transcriptsSnapshot.forEach(doc => {
      transcripts.push({ id: doc.id, ...doc.data() });
    });

    res.json(transcripts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;