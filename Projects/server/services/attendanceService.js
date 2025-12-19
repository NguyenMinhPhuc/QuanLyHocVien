const db = require('../db');

async function getAttendanceByClassAndDate(classId, date) {
  const p = await db.getPool();
  const result = await p.request()
    .input('class_id', classId)
    .input('date', date)
    .execute('sp_attendance_get_by_class_and_date');
  return result.recordset || [];
}

async function getAttendanceForStudents(classId, date) {
  // return attendance keyed by student_id
  const rows = await getAttendanceByClassAndDate(classId, date);
  const map = {};
  (rows || []).forEach(r => { map[r.student_id] = r; });
  return map;
}

async function upsertAttendanceEntries(classId, date, records, createdByUserId) {
  // records: [{ student_id, status, checkin_time }]
  const p = await db.getPool();
  const tx = await p.transaction();
  try {
    await tx.begin();

    for (const rec of records) {
      const { student_id, status, checkin_time } = rec;
      await tx.request()
        .input('class_id', classId)
        .input('student_id', student_id)
        .input('date', date)
        .input('status', status)
        .input('checkin_time', checkin_time || null)
        .execute('sp_attendance_upsert');
    }

    await tx.commit();
    return { success: true };
  } catch (err) {
    try { await tx.rollback(); } catch (e) { /* ignore */ }
    throw err;
  }
}

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

module.exports = {
  getAttendanceByClassAndDate,
  getAttendanceForStudents,
  upsertAttendanceEntries,
  getAllAttendance,
  getAttendanceById,
  createAttendance,
  updateAttendance,
  deleteAttendance
};
