const studentService = require('../services/studentService');

async function listStudents(req, res) {
  try {
    const rows = await studentService.getAllStudents();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function getStudent(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await studentService.getStudentById(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function createStudent(req, res) {
  try {
    const data = req.body;
    const created = await studentService.createStudent(data);
    // created is { student, user, parent }
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function updateStudent(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    const updated = await studentService.updateStudent(id, data);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function deleteStudent(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await studentService.deleteStudent(id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

module.exports = { listStudents, getStudent, createStudent, updateStudent, deleteStudent };
