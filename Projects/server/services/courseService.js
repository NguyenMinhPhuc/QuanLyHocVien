const db = require('../db');

async function getAllCourses() {
  const p = await db.getPool();
  const result = await p.request().execute('sp_courses_get_all');
  return result.recordset;
}

async function getCourseById(id) {
  const p = await db.getPool();
  const result = await p.request().input('id', id).execute('sp_courses_get_by_id');
  return result.recordset[0];
}

async function createCourse(payload) {
  const { name, description, level, sessions, status } = payload;
  const p = await db.getPool();
  const req = p.request()
    .input('name', name)
    .input('description', description)
    .input('level', level)
    .input('sessions', sessions)
    .input('status', status || 'active');
  const result = await req.execute('sp_courses_create');
  return result.recordset[0];
}

async function updateCourse(id, payload) {
  const { name, description, level, sessions, status } = payload;
  const p = await db.getPool();
  const req = p.request()
    .input('id', id)
    .input('name', name)
    .input('description', description)
    .input('level', level)
    .input('sessions', sessions)
    .input('status', status);
  const result = await req.execute('sp_courses_update');
  return result.recordset[0];
}

async function deleteCourse(id) {
  const p = await db.getPool();
  const result = await p.request().input('id', id).execute('sp_courses_delete');
  return result.recordset[0];
}

module.exports = { getAllCourses, getCourseById, createCourse, updateCourse, deleteCourse };
