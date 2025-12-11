const db = require('../db');

async function getAllAttendance() {
  const p = await db.getPool();
  const result = await p.request().execute('sp_attendance_get_all');
  return result.recordset;
}

async function getAttendanceById(id) {
  const p = await db.getPool();
  const result = await p.request().input('id', id).execute('sp_attendance_get_by_id');
  return result.recordset[0];
}

async function createAttendance(payload) {
  const { class_id, student_id, date, status, checkin_time } = payload;
  const p = await db.getPool();
  const req = p.request()
    .input('class_id', class_id)
    .input('student_id', student_id)
    .input('date', date)
    .input('status', status)
    .input('checkin_time', checkin_time);
  const result = await req.execute('sp_attendance_create');
  return result.recordset[0];
}

async function updateAttendance(id, payload) {
  const { class_id, student_id, date, status, checkin_time } = payload;
  const p = await db.getPool();
  const req = p.request()
    .input('id', id)
    .input('class_id', class_id)
    .input('student_id', student_id)
    .input('date', date)
    .input('status', status)
    .input('checkin_time', checkin_time);
  const result = await req.execute('sp_attendance_update');
  return result.recordset[0];
}

async function deleteAttendance(id) {
  const p = await db.getPool();
  const result = await p.request().input('id', id).execute('sp_attendance_delete');
  return result.recordset[0];
}

module.exports = { getAllAttendance, getAttendanceById, createAttendance, updateAttendance, deleteAttendance };
