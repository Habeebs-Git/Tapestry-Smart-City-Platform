const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const { protect } = require('../middleware/auth');

// Setup multer with memory storage and 10MB file limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// @route   POST /api/upload
// @desc    Upload an image to Cloudinary
// @access  Private
router.post('/', protect, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file selected.' });
    }

    // Check file type
    const okTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!okTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Use jpg, jpeg, png or webp.' });
    }

    // Initialize Cloudinary upload stream
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'tapestry_issues' },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return res.status(500).json({ error: 'Cloudinary upload failed' });
        }
        res.json({ imageUrl: result.secure_url });
      }
    );

    // Convert buffer to readable stream and pipe it to Cloudinary
    const readable = new Readable();
    readable.push(req.file.buffer);
    readable.push(null);
    readable.pipe(stream);
  } catch (error) {
    console.error('Upload route error:', error);
    res.status(500).json({ error: 'Server error during upload' });
  }
});

module.exports = router;
