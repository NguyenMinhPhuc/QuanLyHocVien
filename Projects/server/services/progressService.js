const db = require('../db');

async function getAllProgress() {
  const p = await db.getPool();
  const result = await p.request().execute('sp_progress_get_all');
  return result.recordset;
}

async function getProgressById(id) {
  const p = await db.getPool();
  const result = await p.request().input('id', id).execute('sp_progress_get_by_id');
  return result.recordset[0];
}

async function createProgress(payload) {
  const { student_id, class_id, session_number, status } = payload;
  const p = await db.getPool();
  const req = p.request()
    .input('student_id', student_id)
    .input('class_id', class_id)
    .input('session_number', session_number)
    .input('status', status);
  const result = await req.execute('sp_progress_create');
  return result.recordset[0];
}

async function updateProgress(id, payload) {
  const { student_id, class_id, session_number, status } = payload;
  const p = await db.getPool();
  const req = p.request()
    .input('id', id)
    .input('student_id', student_id)
    .input('class_id', class_id)
    .input('session_number', session_number)
    .input('status', status);
  const result = await req.execute('sp_progress_update');
  return result.recordset[0];
}

async function deleteProgress(id) {
  const p = await db.getPool();
  const result = await p.request().input('id', id).execute('sp_progress_delete');
  return result.recordset[0];
}

module.exports = { getAllProgress, getProgressById, createProgress, updateProgress, deleteProgress };
