const db = require('../db');

async function getEnrollmentsByClass(classId) {
  try {
    const p = await db.getPool();
    const result = await p.request().input('class_id', classId).execute('sp_enrollments_get_by_class');
    const rows = result.recordset || [];

    // compute total_paid per enrollment in a single query
    if (rows.length === 0) return rows;
    const ids = rows.map(r => r.id).filter(Boolean);
    if (ids.length === 0) return rows;
    // build parameterized IN clause safely by using table-valued parameter is preferable,
    // but for simplicity here we build a comma list (ids are integers from DB).
    const idList = ids.join(',');
    const payments = await db.query(`SELECT enrollment_id, ISNULL(SUM(amount),0) AS total_paid FROM Payments WHERE enrollment_id IN (${idList}) GROUP BY enrollment_id`);
    const payMap = (payments || []).reduce((acc, p) => { acc[p.enrollment_id] = Number(p.total_paid || 0); return acc; }, {});

    return rows.map(r => ({
      ...r,
      total_paid: payMap[r.id] || 0,
      // keep outstanding_balance if present; otherwise compute negative balance if payments exceed stored amount
      outstanding_balance: (r.outstanding_balance != null) ? Number(r.outstanding_balance) : null
    }));
  } catch (err) {
    console.error('[enrollmentService] getEnrollmentsByClass error', { classId, message: err.message });
    throw err;
  }
}

async function getEnrollmentById(id) {
  const p = await db.getPool();
  const result = await p.request().input('id', id).execute('sp_enrollments_get_by_id');
  return result.recordset[0];
}

async function createEnrollment(payload) {
  const { class_id, student_id, assigned_teacher_id, registration_date, status, outstanding_balance, notes } = payload;
  try {
    const p = await db.getPool();
    const req = p.request()
      .input('class_id', class_id)
      .input('student_id', student_id)
      .input('assigned_teacher_id', assigned_teacher_id)
      .input('registration_date', registration_date)
      .input('status', status || 'active')
      .input('outstanding_balance', outstanding_balance || 0)
      .input('notes', notes);
    const result = await req.execute('sp_enrollments_create');
    return result.recordset[0];
  } catch (err) {
    console.error('[enrollmentService] createEnrollment error', { payload, message: err.message });
    throw err;
  }
}

async function updateEnrollment(id, payload) {
  const { assigned_teacher_id, registration_date, status, outstanding_balance, notes } = payload;
  try {
    const p = await db.getPool();
    const req = p.request()
      .input('id', id)
      .input('assigned_teacher_id', assigned_teacher_id)
      .input('registration_date', registration_date)
      .input('status', status)
      .input('outstanding_balance', outstanding_balance)
      .input('notes', notes);
    const result = await req.execute('sp_enrollments_update');
    return result.recordset[0];
  } catch (err) {
    console.error('[enrollmentService] updateEnrollment error', { id, payload, message: err.message });
    throw err;
  }
}

async function transferEnrollment(id, newClassId) {
  const p = await db.getPool();
  const result = await p.request().input('id', id).input('new_class_id', newClassId).execute('sp_enrollments_transfer');
  return result.recordset[0];
}

async function addPayment(enrollmentId, payload) {
  const { amount, method, note } = payload;
  try {
    const p = await db.getPool();
    const req = p.request().input('enrollment_id', enrollmentId).input('amount', amount).input('method', method).input('note', note);
    const result = await req.execute('sp_payments_add');
    return result.recordset[0];
  } catch (err) {
    console.error('[enrollmentService] addPayment error', { enrollmentId, payload, message: err.message });
    throw err;
  }
}

async function getPaymentsByEnrollment(enrollmentId) {
  const p = await db.getPool();
  const result = await p.request().input('enrollment_id', enrollmentId).execute('sp_payments_get_by_enrollment');
  return result.recordset || [];
}

module.exports = { getEnrollmentsByClass, getEnrollmentById, createEnrollment, updateEnrollment, transferEnrollment, addPayment, getPaymentsByEnrollment };