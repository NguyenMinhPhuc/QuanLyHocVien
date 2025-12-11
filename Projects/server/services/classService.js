const db = require('../db');

async function getAllClasses() {
  const p = await db.getPool();
  const result = await p.request().execute('sp_classes_get_all');
  return result.recordset;
}

async function getAllClassesWithReservedCount() {
  // Prefer to call the stored procedure `sp_classes_get_all` which may
  // include joined course/teacher names and reserved_count. If the SP
  // does not return `course_name` or `teacher_name` (for example the
  // caller selected `co.name, t.name` without aliases), we normalize
  // the result by loading Courses and Teachers and mapping names.
  const p = await db.getPool();
  const result = await p.request().execute('sp_classes_get_all');
  let rows = result && result.recordset ? result.recordset : [];

  // normalize keys: prefer existing course_name/teacher_name; if missing, lookup by id
  const needsCourseName = rows.length > 0 && !('course_name' in rows[0]);
  const needsTeacherName = rows.length > 0 && !('teacher_name' in rows[0]);
  if (needsCourseName || needsTeacherName) {
    // load all courses and teachers once
    const [courses, teachers] = await Promise.all([
      db.query('SELECT id, name FROM Courses'),
      db.query('SELECT id, name FROM Teachers')
    ]);
    const courseMap = (courses || []).reduce((acc, c) => { acc[c.id] = c.name || c.name; return acc }, {});
    const teacherMap = (teachers || []).reduce((acc, t) => { acc[t.id] = t.name || t.name; return acc }, {});

    rows = (rows || []).map(r => ({
      // keep existing properties
      ...r,
      course_name: r.course_name || r.name || courseMap[r.course_id] || courseMap[r.course] || null,
      teacher_name: r.teacher_name || r.name || teacherMap[r.teacher_id] || teacherMap[r.teacher] || null,
      // normalize students count: frontend expects `student_count`.
      student_count: (r.student_count || r.students || r.studentsqty) || 0
    }));
  }

  // If SP didn't provide any students count at all, fetch aggregates as a fallback
  const needCounts = rows.length > 0 && !rows.some(r => (r.student_count || r.students || r.studentsqty));
  if (needCounts) {
    const counts = await db.query('SELECT class_id, COUNT(*) AS cnt FROM ClassStudents GROUP BY class_id');
    const countMap = (counts || []).reduce((acc, c) => { acc[c.class_id] = c.cnt; return acc; }, {});
    rows = (rows || []).map(r => ({ ...r, student_count: r.student_count || countMap[r.id] || 0 }));
  }

  return rows || [];
}

async function getClassById(id) {
  const p = await db.getPool();
  const result = await p.request().input('id', id).execute('sp_classes_get_by_id');
  return result.recordset[0];
}

async function createClass(payload) {
  const { course_id, teacher_id, room, schedule, registration_open_date, registration_close_date, course_start_date, course_end_date, status } = payload;
  const p = await db.getPool();
  const req = p.request()
    .input('course_id', course_id)
    .input('teacher_id', teacher_id)
    .input('room', room)
    .input('schedule', schedule)
    .input('registration_open_date', registration_open_date)
    .input('registration_close_date', registration_close_date)
    .input('course_start_date', course_start_date)
    .input('course_end_date', course_end_date)
    .input('status', status || 'active');
  const result = await req.execute('sp_classes_create');
  return result.recordset[0];
}

async function updateClass(id, payload) {
  const { course_id, teacher_id, room, schedule, registration_open_date, registration_close_date, course_start_date, course_end_date, status } = payload;
  const p = await db.getPool();
  const req = p.request()
    .input('id', id)
    .input('course_id', course_id)
    .input('teacher_id', teacher_id)
    .input('room', room)
    .input('schedule', schedule)
    .input('registration_open_date', registration_open_date)
    .input('registration_close_date', registration_close_date)
    .input('course_start_date', course_start_date)
    .input('course_end_date', course_end_date)
    .input('status', status);
  const result = await req.execute('sp_classes_update');
  return result.recordset[0];
}

async function deleteClass(id) {
  const p = await db.getPool();
  const result = await p.request().input('id', id).execute('sp_classes_delete');
  return result.recordset[0];
}

async function getStudentsByClass(classId) {
  const p = await db.getPool();
  const result = await p.request().input('class_id', classId).execute('sp_class_students_get_by_class');
  return result.recordset || [];
}

async function addStudentToClass(classId, studentId) {
  const p = await db.getPool();
  const result = await p.request().input('class_id', classId).input('student_id', studentId).execute('sp_class_students_add');
  return result.recordset && result.recordset[0];
}

async function removeStudentFromClass(classId, studentId) {
  const p = await db.getPool();
  const result = await p.request().input('class_id', classId).input('student_id', studentId).execute('sp_class_students_remove');
  return result.recordset && result.recordset[0];
}

async function updateStudentStatus(classId, studentId, status) {
  // Update the ClassStudents.status for a given class and student. Returns rows affected.
  const sql = `UPDATE ClassStudents SET status = @status WHERE class_id = @class_id AND student_id = @student_id; SELECT @@ROWCOUNT AS rows_affected;`;
  const rows = await db.query(sql, { status, class_id: classId, student_id: studentId });
  return rows && rows[0];
}

async function getTeachersByClass(classId) {
  const p = await db.getPool();
  const result = await p.request().input('class_id', classId).execute('sp_class_teachers_get_by_class');
  return result.recordset || [];
}

async function addTeacherToClass(classId, teacherId) {
  const p = await db.getPool();
  const result = await p.request().input('class_id', classId).input('teacher_id', teacherId).execute('sp_class_teachers_add');
  return result.recordset && result.recordset[0];
}

async function removeTeacherFromClass(classId, teacherId) {
  const p = await db.getPool();
  const result = await p.request().input('class_id', classId).input('teacher_id', teacherId).execute('sp_class_teachers_remove');
  return result.recordset && result.recordset[0];
}

module.exports = { getAllClasses, getAllClassesWithReservedCount, getClassById, createClass, updateClass, deleteClass, getStudentsByClass, addStudentToClass, removeStudentFromClass, updateStudentStatus, getTeachersByClass, addTeacherToClass, removeTeacherFromClass };
