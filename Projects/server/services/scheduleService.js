const db = require('../db');

async function getAllSchedules() {
  const p = await db.getPool();
  const result = await p.request().execute('sp_schedules_get_all');
  return result.recordset;
}

async function getSchedules(options = {}) {
  const { q, page = 1, pageSize = 20, sortField = 'id', sortDir = 'asc', classId, weekday } = options;
  const offset = (Math.max(1, Number(page)) - 1) * Number(pageSize);
  const where = [];
  const params = {};
  if (q) {
    where.push(`(c.name LIKE '%' + @q + '%' OR cr.name LIKE '%' + @q + '%' OR t.name LIKE '%' + @q + '%')`);
    params.q = q;
  }
  if (classId) {
    where.push('s.class_id = @classId'); params.classId = Number(classId);
  }
  if (typeof weekday !== 'undefined' && weekday !== null && weekday !== '') {
    where.push('s.weekday = @weekday'); params.weekday = Number(weekday);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  // protect sort field
  const allowedSort = ['id', 'class_id', 'weekday', 'schedule_date', 'start_time', 'end_time'];
  const sf = allowedSort.includes(sortField) ? sortField : 'id';
  const sd = String(sortDir).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  // select formatted times (HH:MM) to avoid timezone shifts when driver returns Date objects
  const sql = `
    SELECT s.id, s.class_id, s.weekday, s.schedule_date,
      CONVERT(VARCHAR(5), s.start_time, 108) AS start_time,
      CONVERT(VARCHAR(5), s.end_time, 108) AS end_time,
      c.course_id, cr.name as course_name, t.name as teacher_name, t.phone as teacher_phone
    FROM Schedules s
    LEFT JOIN Classes c ON c.id = s.class_id
    LEFT JOIN Courses cr ON cr.id = c.course_id
    LEFT JOIN Teachers t ON t.id = c.teacher_id
    ${whereSql}
    ORDER BY ${sf === 'start_time' || sf === 'end_time' ? `s.${sf}` : `s.${sf}`} ${sd}
    OFFSET ${offset} ROWS FETCH NEXT ${Number(pageSize)} ROWS ONLY;
  `;

  const countSql = `SELECT COUNT(*) AS total FROM Schedules s LEFT JOIN Classes c ON c.id = s.class_id LEFT JOIN Courses cr ON cr.id = c.course_id LEFT JOIN Teachers t ON t.id = c.teacher_id ${whereSql}`;

  const rows = await db.query(sql, params);
  const cnt = await db.query(countSql, params);
  const total = (cnt && cnt[0] && cnt[0].total) ? Number(cnt[0].total) : 0;
  return { rows: rows || [], total, page: Number(page), pageSize: Number(pageSize) };
}

async function getScheduleById(id) {
  // fetch with formatted times to avoid timezone issues
  const sql = `
    SELECT s.id, s.class_id, s.weekday, s.schedule_date,
      CONVERT(VARCHAR(5), s.start_time, 108) AS start_time,
      CONVERT(VARCHAR(5), s.end_time, 108) AS end_time,
      c.course_id, cr.name as course_name, t.name as teacher_name, t.phone as teacher_phone
    FROM Schedules s
    LEFT JOIN Classes c ON c.id = s.class_id
    LEFT JOIN Courses cr ON cr.id = c.course_id
    LEFT JOIN Teachers t ON t.id = c.teacher_id
    WHERE s.id = @id
  `;
  const rows = await db.query(sql, { id });
  return (rows && rows[0]) ? rows[0] : null;
}

async function createSchedule(payload) {
  const { class_id, weekday, start_time, end_time, schedule_date } = payload;
  const p = await db.getPool();
  const req = p.request()
    .input('class_id', class_id)
    .input('weekday', weekday)
    .input('start_time', start_time)
    .input('end_time', end_time)
    .input('schedule_date', schedule_date);
  const result = await req.execute('sp_schedules_create');
  return result.recordset[0];
}

async function updateSchedule(id, payload) {
  const { class_id, weekday, start_time, end_time, schedule_date } = payload;
  const p = await db.getPool();
  const req = p.request()
    .input('id', id)
    .input('class_id', class_id)
    .input('weekday', weekday)
    .input('start_time', start_time)
    .input('end_time', end_time)
    .input('schedule_date', schedule_date);
  const result = await req.execute('sp_schedules_update');
  return result.recordset[0];
}

async function deleteSchedule(id) {
  const p = await db.getPool();
  const result = await p.request().input('id', id).execute('sp_schedules_delete');
  return result.recordset[0];
}

module.exports = { getAllSchedules, getSchedules, getScheduleById, createSchedule, updateSchedule, deleteSchedule };
