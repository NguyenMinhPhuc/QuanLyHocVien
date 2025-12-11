const enrollmentService = require('../services/enrollmentService');
const classService = require('../services/classService');

// POST /api/enrollments/:id/hold
async function holdEnrollment(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { action, reason } = req.body || {};
    if (!action || !['hold', 'resume', 'withdraw'].includes(action)) return res.status(400).json({ error: 'action required (hold|resume|withdraw)' });

    const enrollment = await enrollmentService.getEnrollmentById(id);
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
    const studentId = enrollment.student_id || enrollment.studentId;
    const classId = enrollment.class_id || enrollment.classId;

    if (action === 'hold') {
      // set enrollment status and update class_students status
      await enrollmentService.updateEnrollment(id, { status: 'reserved', notes: (enrollment.notes ? enrollment.notes + '\n' : '') + `On hold: ${reason || ''} at ${new Date().toISOString()}` });
      // remove student from class roster so they don't appear in the active list
      try {
        await classService.removeStudentFromClass(classId, studentId);
      } catch (e) {
        console.error('holdEnrollment: failed to remove student from class', { classId, studentId, message: e.message });
      }
    } else if (action === 'resume') {
      // add student back to class roster and mark enrollment active
      try {
        await classService.addStudentToClass(classId, studentId);
      } catch (e) {
        console.error('holdEnrollment: failed to add student back to class', { classId, studentId, message: e.message });
      }
      await enrollmentService.updateEnrollment(id, { status: 'active', notes: (enrollment.notes ? enrollment.notes + '\n' : '') + `Resumed: ${reason || ''} at ${new Date().toISOString()}` });
    } else if (action === 'withdraw') {
      await enrollmentService.updateEnrollment(id, { status: 'withdrawn', notes: (enrollment.notes ? enrollment.notes + '\n' : '') + `Withdrawn: ${reason || ''} at ${new Date().toISOString()}` });
      try {
        await classService.removeStudentFromClass(classId, studentId);
      } catch (e) {
        console.error('holdEnrollment: failed to remove student from class on withdraw', { classId, studentId, message: e.message });
      }
    }

    const refreshed = await enrollmentService.getEnrollmentById(id);
    res.json(refreshed);
  } catch (err) {
    console.error('enrollments.holdEnrollment error', err);
    res.status(500).json({ error: err.message || 'Database error' });
  }
}

async function listByClass(req, res) {
  try {
    const classId = parseInt(req.params.classId, 10);
    // load current enrollments
    let rows = await enrollmentService.getEnrollmentsByClass(classId);

    // ensure every student in ClassStudents has an Enrollment record
    try {
      const classStudents = await classService.getStudentsByClass(classId);
      const enrolledStudentIds = new Set((rows || []).map(r => r.student_id));
      for (const cs of (classStudents || [])) {
        const sid = cs.student_id || cs.id || cs.studentId;
        if (!sid) continue;
        if (!enrolledStudentIds.has(sid)) {
          // create enrollment using enrolled_at if available
          const payload = {
            class_id: classId,
            student_id: sid,
            registration_date: cs.enrolled_at || cs.registration_date || null,
            status: cs.status || 'active',
            outstanding_balance: 0,
            notes: 'Auto-created from ClassStudents'
          };
          try {
            const created = await enrollmentService.createEnrollment(payload);
            if (created && created.id) {
              rows.push(created);
              enrolledStudentIds.add(sid);
            }
          } catch (e) {
            console.error('Failed to create enrollment for student', sid, e);
            // continue with others
          }
        }
      }
    } catch (e) {
      console.error('Error ensuring enrollments from ClassStudents', e);
    }

    res.json(rows);
  } catch (err) {
    console.error('enrollments.listByClass error', err);
    res.status(500).json({ error: err.message || 'Database error' });
  }
}

async function getById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await enrollmentService.getEnrollmentById(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    console.error('enrollments.getById error', err);
    res.status(500).json({ error: err.message || 'Database error' });
  }
}

async function create(req, res) {
  try {
    const classId = parseInt(req.params.classId, 10);
    const payload = { ...req.body, class_id: classId };
    const created = await enrollmentService.createEnrollment(payload);
    res.status(201).json(created);
  } catch (err) {
    console.error('enrollments.create error', err);
    res.status(500).json({ error: err.message || 'Database error' });
  }
}

async function update(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const payload = req.body;
    const updated = await enrollmentService.updateEnrollment(id, payload);
    res.json(updated);
  } catch (err) {
    console.error('enrollments.update error', err);
    res.status(500).json({ error: err.message || 'Database error' });
  }
}

async function transfer(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { new_class_id } = req.body || {};
    if (!new_class_id && new_class_id !== 0) return res.status(400).json({ error: 'new_class_id required' });

    const existing = await enrollmentService.getEnrollmentById(id);
    if (!existing) return res.status(404).json({ error: 'Enrollment not found' });
    const studentId = existing.student_id || existing.studentId;
    const oldClassId = existing.class_id || existing.classId;
    const targetClassId = parseInt(new_class_id, 10);
    if (!Number.isInteger(targetClassId) || targetClassId <= 0) return res.status(400).json({ error: 'new_class_id must be a positive integer' });

    if (Number(oldClassId) === Number(targetClassId)) {
      const refreshed = await enrollmentService.getEnrollmentById(id);
      return res.json(refreshed);
    }

    // Add student to target class (if not already). If this fails, abort.
    try {
      await classService.addStudentToClass(targetClassId, studentId);
    } catch (e) {
      console.error('transfer: failed to add student to target class', { targetClassId, studentId, message: e.message });
      return res.status(500).json({ error: 'Failed to add student to target class', detail: e.message });
    }

    // Update enrollment record to new class
    try {
      const updated = await enrollmentService.transferEnrollment(id, targetClassId);
      if (!updated) throw new Error('transferEnrollment did not return updated row');
    } catch (e) {
      console.error('transfer: failed to update enrollment to new class', { id, targetClassId, message: e.message });
      // attempt rollback
      try { await classService.removeStudentFromClass(targetClassId, studentId); } catch (rbErr) { console.error('transfer: rollback failed', rbErr); }
      return res.status(500).json({ error: 'Failed to transfer enrollment', detail: e.message });
    }

    // Remove student from old class (best-effort)
    try {
      if (oldClassId && Number(oldClassId) !== Number(targetClassId)) {
        await classService.removeStudentFromClass(oldClassId, studentId);
      }
    } catch (e) { console.error('transfer: failed to remove student from old class', e); }

    // Ensure enrollment status is active after transfer
    try { await enrollmentService.updateEnrollment(id, { status: 'active' }); } catch (e) { console.error('transfer: failed to set active', e); }

    const refreshed = await enrollmentService.getEnrollmentById(id);
    res.json(refreshed);
  } catch (err) {
    console.error('enrollments.transfer error', err);
    res.status(500).json({ error: err.message || 'Database error' });
  }
}

async function addPayment(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const payload = req.body;
    if (!payload.amount) return res.status(400).json({ error: 'amount required' });
    const payment = await enrollmentService.addPayment(id, payload);
    res.status(201).json(payment);
  } catch (err) {
    console.error('enrollments.addPayment error', err);
    res.status(500).json({ error: err.message || 'Database error' });
  }
}

async function getPayments(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const rows = await enrollmentService.getPaymentsByEnrollment(id);
    res.json(rows);
  } catch (err) {
    console.error('enrollments.getPayments error', err);
    res.status(500).json({ error: err.message || 'Database error' });
  }
}

// Sync enrollments from ClassStudents -> Enrollments for a class
async function syncEnrollments(req, res) {
  try {
    const classId = parseInt(req.params.classId, 10);
    console.log('[syncEnrollments] start', { classId });
    // current enrollments
    let rows = await enrollmentService.getEnrollmentsByClass(classId);
    console.log('[syncEnrollments] current enrollments', { count: Array.isArray(rows) ? rows.length : 0 });
    const enrolledStudentIds = new Set((rows || []).map(r => r.student_id));

    // get class students
    const classStudents = await classService.getStudentsByClass(classId);
    console.log('[syncEnrollments] classStudents', { count: Array.isArray(classStudents) ? classStudents.length : 0 });
    for (const cs of (classStudents || [])) {
      const sid = cs.student_id || cs.id || cs.studentId;
      if (!sid) continue;
      if (!enrolledStudentIds.has(sid)) {
        const payload = {
          class_id: classId,
          student_id: sid,
          registration_date: cs.enrolled_at || cs.registration_date || null,
          status: cs.status || 'active',
          outstanding_balance: 0,
          notes: 'Auto-created via sync'
        };
        try {
          const created = await enrollmentService.createEnrollment(payload);
          if (created && created.id) {
            rows.push(created);
            enrolledStudentIds.add(sid);
          }
        } catch (e) {
          console.error('syncEnrollments: failed to create enrollment for', sid, 'payload:', payload, 'error:', e.message);
        }
      } else {
        // optional: update existing enrollment's status/date if different
        // find existing
        const existing = rows.find(r => Number(r.student_id) === Number(sid));
        if (existing) {
          const updatePayload = {};
          if (cs.enrolled_at && (!existing.registration_date || existing.registration_date !== cs.enrolled_at)) updatePayload.registration_date = cs.enrolled_at;
          if (cs.status && existing.status !== cs.status) updatePayload.status = cs.status;
          if (Object.keys(updatePayload).length) {
            try {
              await enrollmentService.updateEnrollment(existing.id, updatePayload);
            } catch (e) {
              console.error('syncEnrollments: failed to update enrollment for', sid, 'payload:', updatePayload, 'error:', e.message);
            }
          }
        }
      }
    }

    // return refreshed list
    const refreshed = await enrollmentService.getEnrollmentsByClass(classId);
    console.log('[syncEnrollments] done', { classId, count: Array.isArray(refreshed) ? refreshed.length : 0 });
    res.json(refreshed);
  } catch (err) {
    console.error('enrollments.syncEnrollments error', err.message, err);
    res.status(500).json({ error: err.message || 'Database error' });
  }
}

module.exports = { listByClass, getById, create, update, transfer, addPayment, getPayments, syncEnrollments, holdEnrollment };