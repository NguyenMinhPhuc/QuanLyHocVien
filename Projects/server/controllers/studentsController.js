const studentService = require('../services/studentService');
const enrollmentService = require('../services/enrollmentService');
const db = require('../db');

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

async function debtSummary(req, res) {
  try {
    const opts = {
      q: req.query.q || null,
      sortField: req.query.sortField || undefined,
      sortDir: req.query.sortDir || undefined,
      minOutstanding: req.query.minOutstanding || undefined,
      maxOutstanding: req.query.maxOutstanding || undefined,
      hasDebt: typeof req.query.hasDebt !== 'undefined' ? req.query.hasDebt : undefined,
      page: req.query.page || 1,
      pageSize: req.query.pageSize || 20
    };
    const result = await studentService.getStudentsDebtSummary(opts);
    res.json(result);
  } catch (err) {
    console.error('students.debtSummary error', err);
    res.status(500).json({ error: 'Database error' });
  }
}

// POST /api/students/:id/pay  { amount, method, note }
async function payDebt(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { amount, method, note } = req.body || {};
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'amount required' });
    const p = await db.getPool();
    // find an enrollment with outstanding_balance > 0 for this student (oldest first)
    const q = `SELECT TOP 1 id, outstanding_balance FROM Enrollments WHERE student_id = @id AND (outstanding_balance IS NOT NULL AND outstanding_balance > 0) ORDER BY registration_date ASC`;
    const rows = await p.request().input('id', id).query(q);
    const en = rows && rows.recordset && rows.recordset[0];
    if (!en) return res.status(400).json({ error: 'No enrollment with outstanding balance found for student' });
    const resAdd = await enrollmentService.addPayment(en.id, { amount: Number(amount), method: (method || 'cash'), note: note || 'Payment via student debt page' });
    res.status(201).json(resAdd);
  } catch (err) {
    console.error('students.payDebt error', err);
    res.status(500).json({ error: 'Database error' });
  }
}

module.exports.debtSummary = debtSummary;
module.exports.payDebt = payDebt;

async function enrollmentsByStudent(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'invalid id' });
    const rows = await enrollmentService.getEnrollmentsByStudent(id);
    res.json(rows);
  } catch (err) {
    console.error('students.enrollmentsByStudent error', err);
    res.status(500).json({ error: 'Database error' });
  }
}

module.exports.enrollmentsByStudent = enrollmentsByStudent;
