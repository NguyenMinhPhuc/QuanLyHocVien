const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const parentService = require('../services/parentService');

// DELETE /api/parents/:id  -> disable parent & associated user, unlink from students
router.delete('/:id', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    await parentService.disableParentAndUnlink(id);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to disable parent', err);
    res.status(500).json({ error: 'Failed to disable parent' });
  }
});

module.exports = router;
