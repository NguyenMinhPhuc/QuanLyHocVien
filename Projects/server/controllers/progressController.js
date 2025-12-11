const progressService = require('../services/progressService');

async function listProgress(req, res) {
  try {
    const rows = await progressService.getAllProgress();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function getProgress(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await progressService.getProgressById(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function createProgress(req, res) {
  try {
    const data = req.body;
    const created = await progressService.createProgress(data);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function updateProgress(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    const updated = await progressService.updateProgress(id, data);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function deleteProgress(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await progressService.deleteProgress(id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

module.exports = { listProgress, getProgress, createProgress, updateProgress, deleteProgress };
