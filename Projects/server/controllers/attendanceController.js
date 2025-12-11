const attendanceService = require('../services/attendanceService');

async function listAttendance(req, res) {
  try {
    const rows = await attendanceService.getAllAttendance();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function getAttendance(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await attendanceService.getAttendanceById(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function createAttendance(req, res) {
  try {
    const data = req.body;
    const created = await attendanceService.createAttendance(data);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function updateAttendance(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    const updated = await attendanceService.updateAttendance(id, data);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function deleteAttendance(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await attendanceService.deleteAttendance(id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

module.exports = { listAttendance, getAttendance, createAttendance, updateAttendance, deleteAttendance };
