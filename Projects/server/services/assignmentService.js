const db = require('../db');

async function getAllAssignments() {
  const p = await db.getPool();
  const result = await p.request().execute('sp_assignments_get_all');
  return result.recordset;
}

async function getAssignmentById(id) {
  const p = await db.getPool();
  const result = await p.request().input('id', id).execute('sp_assignments_get_by_id');
  return result.recordset[0];
}

async function createAssignment(payload) {
  const { class_id, title, description, deadline } = payload;
  const p = await db.getPool();
  const req = p.request()
    .input('class_id', class_id)
    .input('title', title)
    .input('description', description)
    .input('deadline', deadline);
  const result = await req.execute('sp_assignments_create');
  return result.recordset[0];
}

async function updateAssignment(id, payload) {
  const { class_id, title, description, deadline } = payload;
  const p = await db.getPool();
  const req = p.request()
    .input('id', id)
    .input('class_id', class_id)
    .input('title', title)
    .input('description', description)
    .input('deadline', deadline);
  const result = await req.execute('sp_assignments_update');
  return result.recordset[0];
}

async function deleteAssignment(id) {
  const p = await db.getPool();
  const result = await p.request().input('id', id).execute('sp_assignments_delete');
  return result.recordset[0];
}

module.exports = { getAllAssignments, getAssignmentById, createAssignment, updateAssignment, deleteAssignment };
