const assignmentService = require('../services/assignmentService');

async function listAssignments(req, res) {
  try {
    const rows = await assignmentService.getAllAssignments();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function getAssignment(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await assignmentService.getAssignmentById(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function createAssignment(req, res) {
  try {
    const data = req.body;
    const created = await assignmentService.createAssignment(data);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function updateAssignment(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    const updated = await assignmentService.updateAssignment(id, data);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function deleteAssignment(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await assignmentService.deleteAssignment(id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

module.exports = { listAssignments, getAssignment, createAssignment, updateAssignment, deleteAssignment };
