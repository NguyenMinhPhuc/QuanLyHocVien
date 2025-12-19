const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/search?q=term
router.get('/', authenticateToken, async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (!q) return res.json({ results: [] });
    const qLike = `%${q}%`;

    // perform several lightweight queries in parallel
    const [students, teachers, courses, classes, receipts] = await Promise.all([
      db.query(`
        SELECT TOP 8 s.id, s.name, s.phone, s.email,
               (SELECT COUNT(*) FROM Enrollments e WHERE e.student_id = s.id AND (e.status IS NULL OR e.status <> 'withdrawn')) AS class_count,
               (SELECT ISNULL(SUM(e.outstanding_balance),0) FROM Enrollments e WHERE e.student_id = s.id) AS debt_total
        FROM Students s
        WHERE (s.name LIKE @qLike OR s.phone LIKE @qLike OR s.email LIKE @qLike)
          AND (s.status IS NULL OR s.status <> 'disabled')
        ORDER BY s.name`, { qLike }),
      db.query(`
        SELECT TOP 8 t.id, t.name, t.phone, t.email,
               (SELECT COUNT(*) FROM Classes c WHERE c.teacher_id = t.id) AS class_count,
               (SELECT COUNT(*) FROM Enrollments e JOIN Classes c ON c.id = e.class_id WHERE c.teacher_id = t.id) AS student_count
        FROM Teachers t
        WHERE (t.name LIKE @qLike OR t.phone LIKE @qLike OR t.email LIKE @qLike)
          AND (t.status IS NULL OR t.status <> 'disabled')
        ORDER BY t.name`, { qLike }).catch(() => []),
      db.query(`
        SELECT TOP 8 c.id, c.name,
               (SELECT COUNT(*) FROM Classes cl WHERE cl.course_id = c.id) AS class_count,
               (SELECT COUNT(*) FROM Enrollments e JOIN Classes cl ON cl.id = e.class_id WHERE cl.course_id = c.id) AS student_count
        FROM Courses c
        WHERE c.name LIKE @qLike
        ORDER BY c.name`, { qLike }).catch(() => []),
      db.query(`
        SELECT TOP 8 c.id,
               co.name AS course_name,
               c.course_id,
               (SELECT COUNT(*) FROM Enrollments e WHERE e.class_id = c.id) AS student_count
        FROM Classes c
          LEFT JOIN Courses co ON co.id = c.course_id
        WHERE (co.name LIKE @qLike OR CAST(c.id AS NVARCHAR(50)) LIKE @qLike)
        ORDER BY c.id DESC`, { qLike }).catch(() => []),
      db.query("SELECT TOP 8 id, code, data, enrollment_id FROM Receipts WHERE (code LIKE @qLike) ORDER BY id DESC", { qLike }).catch(() => [])
    ]);

    const results = [];
    (students || []).forEach(s => results.push({ type: 'students', id: s.id, label: s.name, meta: { phone: s.phone, email: s.email, class_count: s.class_count, debt_total: s.debt_total } }));
    (teachers || []).forEach(t => results.push({ type: 'teachers', id: t.id, label: t.name, meta: { phone: t.phone, email: t.email, class_count: t.class_count, student_count: t.student_count } }));
    (courses || []).forEach(c => results.push({ type: 'courses', id: c.id, label: c.name, meta: { class_count: c.class_count, student_count: c.student_count } }));
    (classes || []).forEach(c => results.push({ type: 'classes', id: c.id, label: c.course_name || `Class ${c.id}`, meta: { course_id: c.course_id, student_count: c.student_count } }));
    (receipts || []).forEach(r => results.push({ type: 'receipts', id: r.id, label: r.code || `Receipt ${r.id}`, meta: { enrollment_id: r.enrollment_id } }));

    // Quick links to functions/pages
    const actions = [
      { type: 'action', label: 'Dashboard', href: '/dashboard' },
      { type: 'action', label: 'Điểm danh', href: '/attendance' },
      { type: 'action', label: 'Lớp học', href: '/classes' },
      { type: 'action', label: 'Khóa học', href: '/courses' },
      { type: 'action', label: 'Giáo viên', href: '/teachers' },
      { type: 'action', label: 'Học viên', href: '/debts' },
      { type: 'action', label: 'Lịch học', href: '/schedules' },
      { type: 'action', label: 'Cài đặt', href: '/settings' }
    ].filter(a => a.label.toLowerCase().includes(q.toLowerCase()));

    const merged = [...actions, ...results];

    return res.json({ results: merged });
  } catch (err) {
    console.error('search error', err);
    return res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
