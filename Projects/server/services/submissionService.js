const db = require('../db');

async function getAllSubmissions() {
  const p = await db.getPool();
  const result = await p.request().execute('sp_submissions_get_all');
  return result.recordset;
}

async function getSubmissionById(id) {
  const p = await db.getPool();
  const result = await p.request().input('id', id).execute('sp_submissions_get_by_id');
  return result.recordset[0];
}

async function createSubmission(payload) {
  const { assignment_id, student_id, url, score } = payload;
  const p = await db.getPool();
  const req = p.request()
    .input('assignment_id', assignment_id)
    .input('student_id', student_id)
    .input('url', url)
    .input('score', score);
  const result = await req.execute('sp_submissions_create');
  return result.recordset[0];
}

async function updateSubmission(id, payload) {
  const { assignment_id, student_id, url, score } = payload;
  const p = await db.getPool();
  const req = p.request()
    .input('id', id)
    .input('assignment_id', assignment_id)
    .input('student_id', student_id)
    .input('url', url)
    .input('score', score);
  const result = await req.execute('sp_submissions_update');
  return result.recordset[0];
}

async function deleteSubmission(id) {
  const p = await db.getPool();
  const result = await p.request().input('id', id).execute('sp_submissions_delete');
  return result.recordset[0];
}

module.exports = { getAllSubmissions, getSubmissionById, createSubmission, updateSubmission, deleteSubmission };
