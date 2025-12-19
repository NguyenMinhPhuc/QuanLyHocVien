const attendanceService = require('../services/attendanceService');
const classService = require('../services/classService');

async function getMyClasses(req, res) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const role = (req.user && req.user.role || '').toString().toLowerCase();
    const isAdmin = role === 'admin' || role === 'administrator';
    const date = req.query && req.query.date ? req.query.date : null;

    // Admins can see all classes; teachers see only their classes
    if (isAdmin) {
      // For admins, return all classes and include student_count + attendance counts for the requested date
      let all = await classService.getAllClassesWithReservedCount();
      all = all || [];
      if (date) {
        // compute present/absent counts per class for the date
        const promises = all.map(async c => {
          try {
            const rows = await attendanceService.getAttendanceByClassAndDate(c.id, date);
            const present = (rows || []).filter(r => (r.status || '').toString().toLowerCase() === 'present').length;
            const absent = (rows || []).filter(r => (r.status || '').toString().toLowerCase() === 'absent').length;
            return { ...c, present_count: present, absent_count: absent };
          } catch (e) {
            return { ...c, present_count: 0, absent_count: 0 };
          }
        });
        all = await Promise.all(promises);
      } else {
        // ensure counts exist
        all = (all || []).map(c => ({ ...c, present_count: c.present_count || 0, absent_count: c.absent_count || 0 }));
      }

      return res.json(all);
    }

    const rows = await classService.getClassesByTeacherUser(userId, date);
    return res.json(rows || []);
  } catch (err) {
    console.error('getMyClasses error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getClassStudentsForDate(req, res) {
  try {
    const classId = Number(req.params.classId);
    const date = req.query.date; // expect YYYY-MM-DD
    if (!classId) return res.status(400).json({ error: 'Missing classId' });
    if (!date) return res.status(400).json({ error: 'Missing date' });

    // ensure teacher owns the class
    const userId = req.user && req.user.id;
    const role = (req.user && req.user.role || '').toString().toLowerCase();
    const isAdmin = role === 'admin' || role === 'administrator';
    // allow admins to bypass ownership check
    if (!isAdmin) {
      const owns = await classService.checkClassOwnedByUser(classId, userId);
      if (!owns) return res.status(403).json({ error: 'Forbidden' });
    }

    // load students in class (from ClassStudents join Students)
    const students = await classService.getStudentsByClass(classId);

    // load attendance
    const attendanceMap = await attendanceService.getAttendanceForStudents(classId, date);

    const payload = (students || []).map(s => ({
      student_id: s.id,
      name: s.name,
      phone: s.phone,
      enrollment_status: s.enrollment_status,
      attendance: attendanceMap[s.id] || null
    }));

    return res.json({ class_id: classId, date, students: payload });
  } catch (err) {
    console.error('getClassStudentsForDate error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function postClassAttendance(req, res) {
  try {
    const classId = Number(req.params.classId);
    const { date, records } = req.body || {};
    if (!classId) return res.status(400).json({ error: 'Missing classId' });
    if (!date || !Array.isArray(records)) return res.status(400).json({ error: 'Missing date or records' });

    const userId = req.user && req.user.id;
    const role = (req.user && req.user.role || '').toString().toLowerCase();
    const isAdmin = role === 'admin' || role === 'administrator';
    // allow admins to bypass ownership check
    if (!isAdmin) {
      const owns = await classService.checkClassOwnedByUser(classId, userId);
      if (!owns) return res.status(403).json({ error: 'Forbidden' });
    }

    await attendanceService.upsertAttendanceEntries(classId, date, records, userId);
    return res.json({ success: true });
  } catch (err) {
    console.error('postClassAttendance error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getMyClasses, getClassStudentsForDate, postClassAttendance };
