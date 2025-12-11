const teacherService = require('../services/teacherService');

async function listTeachers(req, res) {
  try {
    const rows = await teacherService.getAllTeachers();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function getTeacher(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await teacherService.getTeacherById(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function createTeacher(req, res) {
  try {
    const data = req.body;
    const created = await teacherService.createTeacher(data);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function updateTeacher(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    const updated = await teacherService.updateTeacher(id, data);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function deleteTeacher(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await teacherService.deleteTeacher(id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

module.exports = { listTeachers, getTeacher, createTeacher, updateTeacher, deleteTeacher };
