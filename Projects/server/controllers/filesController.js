const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const { saveFile, getFileById } = require('../services/fileService');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function getKeyFromEnv() {
  const hex = process.env.FILE_ENCRYPTION_KEY;
  if (!hex) return null;
  try {
    const key = Buffer.from(hex, 'hex');
    if (key.length !== 32) return null;
    return key;
  } catch (err) {
    return null;
  }
}

router.post('/upload-encrypted', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const key = getKeyFromEnv();
    if (!key) return res.status(500).json({ error: 'Server misconfigured: missing FILE_ENCRYPTION_KEY (hex, 32 bytes)' });

    const iv = crypto.randomBytes(12); // recommended for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(req.file.buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const id = await saveFile({
      filename: req.file.originalname,
      mime_type: req.file.mimetype,
      data: encrypted,
      iv: iv,
      auth_tag: authTag
    });

    if (!id) {
      console.error('filesController: saveFile returned null id');
      return res.status(500).json({ error: 'failed to save file' });
    }

    const urlBase = process.env.FRONTEND_ORIGIN || `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${urlBase}/api/files/${id}`;
    console.log(`filesController: file saved id=${id} filename=${req.file.originalname}`);
    res.json({ ok: true, id, url: fileUrl });
  } catch (err) {
    console.error('upload-encrypted error', err);
    res.status(500).json({ error: 'upload failed', details: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'invalid id' });
    const row = await getFileById(id);
    if (!row) return res.status(404).json({ error: 'not found' });
    const key = getKeyFromEnv();
    if (!key) return res.status(500).json({ error: 'Server misconfigured: missing FILE_ENCRYPTION_KEY (hex, 32 bytes)' });

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, row.iv);
    decipher.setAuthTag(row.auth_tag);
    const decrypted = Buffer.concat([decipher.update(row.data), decipher.final()]);

    res.setHeader('Content-Type', row.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${row.filename}"`);
    res.send(decrypted);
  } catch (err) {
    console.error('serve file error', err);
    res.status(500).json({ error: 'failed to serve file' });
  }
});

module.exports = router;
