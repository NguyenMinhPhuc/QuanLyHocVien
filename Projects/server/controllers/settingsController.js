const settingsService = require('../services/settingsService');
const path = require('path');
const fs = require('fs');
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

async function getReceiptSettings(req, res) {
  try {
    const keys = ['receipt_logo_url', 'receipt_center_phone'];
    const settings = await settingsService.getSettings(keys);
    res.json(settings);
  } catch (err) {
    console.error('settings.getReceiptSettings error', err);
    res.status(500).json({ error: err.message || 'Database error' });
  }
}

async function updateReceiptSettings(req, res) {
  try {
    const payload = req.body || {};
    const allowed = {};
    if ('receipt_logo_url' in payload) allowed.receipt_logo_url = payload.receipt_logo_url;
    if ('receipt_center_phone' in payload) allowed.receipt_center_phone = payload.receipt_center_phone;
    await settingsService.setSettings(allowed);
    const updated = await settingsService.getSettings(Object.keys(allowed));
    res.json(updated);
  } catch (err) {
    console.error('settings.updateReceiptSettings error', err);
    res.status(500).json({ error: err.message || 'Database error' });
  }
}

async function uploadLogo(req, res) {
  try {
    // multer attaches file to req.file
    if (!req.file) return res.status(400).json({ error: 'file required' });
    const filename = req.file.filename;
    // build public URL to uploaded file
    const url = `${FRONTEND_ORIGIN.replace(/\/$/, '')}/uploads/${filename}`;
    // persist setting
    await settingsService.setSettings({ receipt_logo_url: url });
    res.json({ url });
  } catch (err) {
    console.error('settings.uploadLogo error', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
}

module.exports = { getReceiptSettings, updateReceiptSettings, uploadLogo };
