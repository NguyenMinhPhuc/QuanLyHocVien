const courseService = require('../services/courseService');

async function listCourses(req, res) {
  try {
    const rows = await courseService.getAllCourses();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function getCourse(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await courseService.getCourseById(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function createCourse(req, res) {
  try {
    const data = req.body;
    const created = await courseService.createCourse(data);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function updateCourse(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    const updated = await courseService.updateCourse(id, data);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function deleteCourse(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await courseService.deleteCourse(id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

module.exports = { listCourses, getCourse, createCourse, updateCourse, deleteCourse };
