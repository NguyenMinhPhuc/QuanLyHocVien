const express = require('express');
const router = express.Router();
const settings = require('../controllers/settingsController');
const multer = require('multer');
const path = require('path');

// configure multer to write to server/public/uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'public', 'uploads'))
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname)
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
    cb(null, name)
  }
})
const upload = multer({ storage });

// GET /api/settings/receipts
router.get('/receipts', settings.getReceiptSettings);
// PUT /api/settings/receipts
router.put('/receipts', settings.updateReceiptSettings);
// POST /api/settings/receipts/upload-logo
router.post('/receipts/upload-logo', upload.single('file'), settings.uploadLogo);

module.exports = router;
