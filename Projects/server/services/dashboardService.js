const db = require('../db');

async function getStats() {
  const results = {};
  const r1 = await db.query('SELECT COUNT(1) AS total FROM Students');
  results.totalStudents = (r1 && r1[0] && r1[0].total) ? Number(r1[0].total) : 0;
  const r2 = await db.query('SELECT COUNT(1) AS total FROM Teachers');
  results.totalTeachers = (r2 && r2[0] && r2[0].total) ? Number(r2[0].total) : 0;
  const r3 = await db.query("SELECT COUNT(1) AS total FROM Classes");
  results.totalClasses = (r3 && r3[0] && r3[0].total) ? Number(r3[0].total) : 0;
  const r4 = await db.query("SELECT COUNT(1) AS total FROM Classes WHERE status = 'active'");
  results.activeClasses = (r4 && r4[0] && r4[0].total) ? Number(r4[0].total) : 0;
  const r5 = await db.query('SELECT COUNT(1) AS total FROM Schedules');
  results.totalSchedules = (r5 && r5[0] && r5[0].total) ? Number(r5[0].total) : 0;
  const r6 = await db.query(`SELECT COUNT(1) AS total FROM Schedules WHERE schedule_date >= CAST(GETDATE() AS DATE)`);
  results.upcomingSessions = (r6 && r6[0] && r6[0].total) ? Number(r6[0].total) : 0;

  // top 5 classes by active students
  const top = await db.query(`
    SELECT TOP 5 cl.id, co.name AS course_name, t.name AS teacher_name,
      (SELECT COUNT(1) FROM ClassStudents cs WHERE cs.class_id = cl.id AND cs.status = 'active') AS student_count
    FROM Classes cl
      LEFT JOIN Courses co ON co.id = cl.course_id
      LEFT JOIN Teachers t ON t.id = cl.teacher_id
    ORDER BY student_count DESC
  `);
  results.topClasses = top || [];

  return results;
}

async function getMonthlyRevenue(year, classId) {
  const p = await db.getPool();
  const req = p.request().input('year', year || new Date().getFullYear());
  let sql = `SELECT MONTH(pa.paid_at) AS mon, ISNULL(SUM(pa.amount),0) AS total FROM Payments pa JOIN Enrollments e ON pa.enrollment_id = e.id`;
  if (classId) {
    sql += ` JOIN Classes c ON e.class_id = c.id WHERE YEAR(pa.paid_at) = @year AND e.class_id = @classId GROUP BY MONTH(pa.paid_at) ORDER BY mon`;
    req.input('classId', classId);
  } else {
    sql += ` WHERE YEAR(pa.paid_at) = @year GROUP BY MONTH(pa.paid_at) ORDER BY mon`;
  }
  const res = await req.query(sql);
  const rows = res && res.recordset ? res.recordset : [];
  // build array of 12 months
  const result = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total: 0 }));
  rows.forEach(r => {
    const m = Number(r.mon || 0);
    if (m >= 1 && m <= 12) result[m - 1].total = Number(r.total || 0);
  });
  return result;
}

module.exports = { getStats, getMonthlyRevenue };
