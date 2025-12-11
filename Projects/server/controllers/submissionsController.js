const submissionService = require('../services/submissionService');

async function listSubmissions(req, res) {
  try {
    const rows = await submissionService.getAllSubmissions();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function getSubmission(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await submissionService.getSubmissionById(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function createSubmission(req, res) {
  try {
    const data = req.body;
    const created = await submissionService.createSubmission(data);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function updateSubmission(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    const updated = await submissionService.updateSubmission(id, data);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function deleteSubmission(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await submissionService.deleteSubmission(id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

module.exports = { listSubmissions, getSubmission, createSubmission, updateSubmission, deleteSubmission };
