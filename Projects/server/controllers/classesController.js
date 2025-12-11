const classService = require('../services/classService');
const studentService = require('../services/studentService');
const teacherService = require('../services/teacherService');

async function listClasses(req, res) {
  try {
    // use the query that includes reserved student counts
    const rows = await classService.getAllClassesWithReservedCount();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function getClass(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await classService.getClassById(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function createClass(req, res) {
  try {
    const data = req.body;
    const created = await classService.createClass(data);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function updateClass(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    const updated = await classService.updateClass(id, data);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function deleteClass(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await classService.deleteClass(id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

module.exports = { listClasses, getClass, createClass, updateClass, deleteClass, getClassStudents, addStudentToClass, removeStudentFromClass, getClassTeachers, addTeacherToClass, removeTeacherFromClass, getActiveByCourse, getActiveClasses };

async function getActiveByCourse(req, res) {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    if (!courseId) return res.status(400).json({ error: 'courseId required' });
    const all = await classService.getAllClasses();
    const today = new Date();
    const candidates = (all || []).filter(cl => Number(cl.course_id) === Number(courseId) && Number(cl.id) && Number(cl.id) > 0 && Number(cl.id) !== Number(req.params.id) && (!cl.course_end_date || new Date(cl.course_end_date) >= new Date(today.toISOString().slice(0, 10))));
    res.json(candidates);
  } catch (err) {
    console.error('getActiveByCourse error', err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function getActiveClasses(req, res) {
  try {
    const all = await classService.getAllClasses();
    const today = new Date();
    const candidates = (all || []).filter(cl => Number(cl.id) && Number(cl.id) > 0 && (!cl.course_end_date || new Date(cl.course_end_date) >= new Date(today.toISOString().slice(0, 10))));
    res.json(candidates);
  } catch (err) {
    console.error('getActiveClasses error', err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function getClassStudents(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const rows = await classService.getStudentsByClass(id);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

// payload: { student_id } or { student: { name, dob, phone, email, parents } }
async function addStudentToClass(req, res) {
  try {
    const classId = parseInt(req.params.id, 10);
    const { student_id, student } = req.body || {};
    let sid = null;
    if (student_id) sid = parseInt(student_id, 10);
    else if (student) {
      // create new student (studentService.createStudent returns complex object)
      const created = await studentService.createStudent(student);
      if (created && created.student && created.student.id) sid = created.student.id;
      else if (created && created.student && created.studentID) sid = created.studentID;
    }
    if (!sid) return res.status(400).json({ error: 'student_id or student payload required' });
    const added = await classService.addStudentToClass(classId, sid);
    res.status(201).json(added);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function removeStudentFromClass(req, res) {
  try {
    const classId = parseInt(req.params.id, 10);
    const studentId = parseInt(req.params.studentId, 10);
    const result = await classService.removeStudentFromClass(classId, studentId);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function getClassTeachers(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const rows = await classService.getTeachersByClass(id);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

// payload: { teacher_id }
async function addTeacherToClass(req, res) {
  try {
    const classId = parseInt(req.params.id, 10);
    const { teacher_id } = req.body || {};
    let tid = null;
    if (teacher_id) tid = parseInt(teacher_id, 10);
    if (!tid) return res.status(400).json({ error: 'teacher_id required' });
    const added = await classService.addTeacherToClass(classId, tid);
    res.status(201).json(added);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function removeTeacherFromClass(req, res) {
  try {
    const classId = parseInt(req.params.id, 10);
    const teacherId = parseInt(req.params.teacherId, 10);
    const result = await classService.removeTeacherFromClass(classId, teacherId);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}
