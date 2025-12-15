const db = require('../db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10', 10);

async function getAllStudents() {
  const p = await db.getPool();
  // only return active students by default
  const result = await p.request().query("SELECT * FROM Students WHERE status <> 'disabled' ORDER BY id");
  return result.recordset;
}

async function getStudentById(id) {
  const p = await db.getPool();
  const result = await p.request().input('id', id).execute('sp_students_get_by_id');
  const student = result.recordset[0];
  if (!student) return null;
  // fetch parents linked to this student
  try {
    const parentsRes = await p.request().input('student_id', id).execute('sp_parents_get_by_student');
    student.parents = parentsRes.recordset || [];
  } catch (err) {
    // if the stored procedure doesn't exist or fails, ignore and continue
    student.parents = [];
  }
  return student;
}

async function createStudent(payload) {
  const { name, dob, phone, email, parent_phone, status, parents } = payload;
  const p = await db.getPool();
  const req = p.request()
    .input('name', name)
    .input('dob', dob)
    .input('phone', phone)
    .input('email', email)
    .input('parent_phone', parent_phone)
    .input('status', status || 'active');
  const result = await req.execute('sp_students_create');
  const student = result.recordset[0];

  // Helper to create a username from preferred source and ensure uniqueness
  const ensureUniqueUsername = async (base, pool) => {
    let username = base;
    let counter = 1;
    while (true) {
      const existing = await pool.request().input('username', username).execute('sp_users_get_by_username');
      if (!existing.recordset || existing.recordset.length === 0) break;
      username = `${base}${counter}`;
      counter += 1;
    }
    return username;
  };

  const poolRef = p;
  // Create student user
  let studentUsernameBase = 'student';
  if (email && typeof email === 'string' && email.includes('@')) {
    studentUsernameBase = email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
  } else if (name) {
    studentUsernameBase = name.split(' ').join('.').replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
  }
  const studentUsername = await ensureUniqueUsername(studentUsernameBase, poolRef);
  const studentPasswordRaw = `${studentUsername}@123`;
  const studentHash = await bcrypt.hash(studentPasswordRaw, await bcrypt.genSalt(SALT_ROUNDS));
  const userRes = await poolRef.request()
    .input('username', studentUsername)
    .input('password_hash', studentHash)
    .input('role', 'student')
    .execute('sp_users_create');
  const createdUser = userRes.recordset && userRes.recordset[0];
  // Optionally create multiple parents if provided
  const parentsCreated = [];
  if (Array.isArray(parents) && parents.length > 0) {
    for (const pInfo of parents) {
      try {
        const parent_name = pInfo.name || null;
        const parent_email = pInfo.email || null;
        const parentPhone = pInfo.phone || null;

        // Choose base from parent_email local-part or phone or name
        let parentBase = 'parent';
        if (parent_email && parent_email.includes('@')) parentBase = parent_email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
        else if (parentPhone) parentBase = parentPhone.replace(/[^0-9]/g, '');
        else if (parent_name) parentBase = parent_name.split(' ').join('.').replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();

        const parentUsername = await ensureUniqueUsername(parentBase, poolRef);
        const parentPasswordRaw = `${parentUsername}@123`;
        const parentHash = await bcrypt.hash(parentPasswordRaw, await bcrypt.genSalt(SALT_ROUNDS));
        const pRes = await poolRef.request()
          .input('username', parentUsername)
          .input('password_hash', parentHash)
          .input('role', 'parent')
          .execute('sp_users_create');
        const createdParentUser = pRes.recordset && pRes.recordset[0];

        // create parent record in Parents table linking to the user
        const parentRecordRes = await poolRef.request()
          .input('name', parent_name)
          .input('phone', parentPhone)
          .input('email', parent_email)
          .input('user_id', createdParentUser && createdParentUser.id)
          .input('student_id', student && student.id)
          .execute('sp_parents_create');
        const parentRecord = parentRecordRes.recordset && parentRecordRes.recordset[0];

        // link parent to student
        await poolRef.request()
          .input('student_id', student.id)
          .input('parent_id', parentRecord && parentRecord.id)
          .input('relationship', pInfo.relationship || null)
          .execute('sp_student_parents_link_create');

        parentsCreated.push({ id: parentRecord && parentRecord.id, username: parentUsername, password: parentPasswordRaw, user_id: createdParentUser && createdParentUser.id });
      } catch (err) {
        // continue with others if one parent fails
        console.error('Failed to create parent for student', err);
      }
    }
  }

  return { student, user: { id: createdUser && createdUser.id, username: studentUsername }, parents: parentsCreated };
}

async function updateStudent(id, payload) {
  const { name, dob, phone, email, parent_phone, status, parents } = payload;
  const p = await db.getPool();
  const tx = await p.transaction();

  // helper to create unique username (copied from createStudent)
  const ensureUniqueUsername = async (base, pool) => {
    let username = base;
    let counter = 1;
    while (true) {
      const existing = await pool.request().input('username', username).execute('sp_users_get_by_username');
      if (!existing.recordset || existing.recordset.length === 0) break;
      username = `${base}${counter}`;
      counter += 1;
    }
    return username;
  };

  try {
    await tx.begin();

    // update student
    await tx.request()
      .input('id', id)
      .input('name', name)
      .input('dob', dob)
      .input('phone', phone)
      .input('email', email)
      .input('parent_phone', parent_phone)
      .input('status', status)
      .execute('sp_students_update');

    const parentsCreated = [];
    if (Array.isArray(parents) && parents.length > 0) {
      for (const pInfo of parents) {
        try {
          const parent_name = pInfo.name || null;
          const parent_email = pInfo.email || null;
          const parentPhone = pInfo.phone || null;
          const relationship = pInfo.relationship || null;

          if (pInfo.id) {
            // update existing parent record
            await tx.request()
              .input('id', pInfo.id)
              .input('name', parent_name)
              .input('phone', parentPhone)
              .input('email', parent_email)
              .query('UPDATE Parents SET name = @name, phone = @phone, email = @email WHERE id = @id');

            // ensure Parents.student_id set
            await tx.request()
              .input('id', pInfo.id)
              .input('student_id', id)
              .query('UPDATE Parents SET student_id = @student_id WHERE id = @id AND (student_id IS NULL OR student_id <> @student_id)');

            // upsert relationship in StudentParents
            await tx.request()
              .input('student_id', id)
              .input('parent_id', pInfo.id)
              .input('relationship', relationship)
              .query("UPDATE StudentParents SET relationship = @relationship WHERE student_id = @student_id AND parent_id = @parent_id; IF @@ROWCOUNT = 0 INSERT INTO StudentParents (student_id, parent_id, relationship) VALUES (@student_id, @parent_id, @relationship);");
          } else {
            // create parent user
            let parentBase = 'parent';
            if (parent_email && parent_email.includes('@')) parentBase = parent_email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
            else if (parentPhone) parentBase = parentPhone.replace(/[^0-9]/g, '');
            else if (parent_name) parentBase = parent_name.split(' ').join('.').replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();

            const parentUsername = await ensureUniqueUsername(parentBase, p);
            const parentPasswordRaw = `${parentUsername}@123`;
            const parentHash = await bcrypt.hash(parentPasswordRaw, await bcrypt.genSalt(SALT_ROUNDS));
            const pRes = await tx.request()
              .input('username', parentUsername)
              .input('password_hash', parentHash)
              .input('role', 'parent')
              .execute('sp_users_create');
            const createdParentUser = pRes.recordset && pRes.recordset[0];

            // create parent record in Parents table linking to the user and student
            const parentRecordRes = await tx.request()
              .input('name', parent_name)
              .input('phone', parentPhone)
              .input('email', parent_email)
              .input('user_id', createdParentUser && createdParentUser.id)
              .input('student_id', id)
              .input('status', 'active')
              .execute('sp_parents_create');
            const parentRecord = parentRecordRes.recordset && parentRecordRes.recordset[0];

            // link parent to student (ensure link exists)
            await tx.request()
              .input('student_id', id)
              .input('parent_id', parentRecord && parentRecord.id)
              .input('relationship', relationship)
              .execute('sp_student_parents_link_create');

            parentsCreated.push({ id: parentRecord && parentRecord.id, username: parentUsername, password: parentPasswordRaw, user_id: createdParentUser && createdParentUser.id });
          }
        } catch (err) {
          console.error('Failed to create/update parent for student', err);
        }
      }
    }

    await tx.commit();

    // return updated student row (keep shape same as previous update behavior)
    const updatedRes = await p.request().input('id', id).execute('sp_students_get_by_id');
    const updatedStudent = updatedRes.recordset && updatedRes.recordset[0];
    return updatedStudent;
  } catch (err) {
    try { await tx.rollback(); } catch (e) { /* ignore */ }
    throw err;
  }
}

async function deleteStudent(id) {
  const p = await db.getPool();
  const tx = await p.transaction();
  try {
    await tx.begin();

    // mark student as disabled instead of deleting
    await tx.request().input('id', id).input('status', 'disabled').query("UPDATE Students SET status = @status WHERE id = @id");

    // disable parents associated with this student (set Parents.status = 'disabled')
    const parentsRes = await tx.request().input('student_id', id).query('SELECT p.id, p.user_id FROM StudentParents sp INNER JOIN Parents p ON p.id = sp.parent_id WHERE sp.student_id = @student_id');
    const parents = parentsRes.recordset || [];
    for (const pRow of parents) {
      if (pRow && pRow.id) {
        await tx.request().input('id', pRow.id).input('status', 'disabled').query("UPDATE Parents SET status = @status WHERE id = @id");
      }
      if (pRow && pRow.user_id) {
        await tx.request().input('user_id', pRow.user_id).input('status', 'disabled').query("UPDATE Users SET status = @status WHERE id = @user_id");
      }
    }

    // attempt to find and disable the student's user account (best-effort)
    // Build username base similar to createStudent logic
    const stuRowRes = await tx.request().input('id', id).query('SELECT name, email FROM Students WHERE id = @id');
    const stuRow = stuRowRes.recordset && stuRowRes.recordset[0];
    if (stuRow) {
      let base = 'student';
      if (stuRow.email && typeof stuRow.email === 'string' && stuRow.email.includes('@')) {
        base = stuRow.email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
      } else if (stuRow.name) {
        base = stuRow.name.split(' ').join('.').replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
      }
      const likeParam = base + '%';
      const userRes = await tx.request().input('username', base).input('like', likeParam).query("SELECT TOP 1 id FROM Users WHERE role = 'student' AND (username = @username OR username LIKE @like) ORDER BY id DESC");
      const userRow = userRes.recordset && userRes.recordset[0];
      if (userRow && userRow.id) {
        await tx.request().input('user_id', userRow.id).input('status', 'disabled').query("UPDATE Users SET status = @status WHERE id = @user_id");
      }
    }

    await tx.commit();
    return { success: true };
  } catch (err) {
    try { await tx.rollback(); } catch (e) { /* ignore */ }
    throw err;
  }
}

module.exports = { getAllStudents, getStudentById, createStudent, updateStudent, deleteStudent };

// debt summary: per-student aggregates with search/sort/filter/pagination
async function getStudentsDebtSummary(options = {}) {
  const {
    q, // search query
    sortField = 'total_outstanding',
    sortDir = 'DESC',
    minOutstanding,
    maxOutstanding,
    hasDebt, // boolean: true => total_outstanding > 0, false => = 0
    page = 1,
    pageSize = 20
  } = options || {};

  try {
    const p = await db.getPool();

    // Base aggregated query (no pagination)
    const baseAgg = `
      SELECT
        s.id,
        s.name,
        s.phone,
        ISNULL(SUM(CASE WHEN e.id IS NOT NULL AND (c.course_end_date IS NULL OR c.course_end_date >= CAST(GETDATE() AS date)) THEN 1 ELSE 0 END),0) AS classes_active,
        ISNULL(SUM(CASE WHEN e.id IS NOT NULL AND c.course_end_date IS NOT NULL AND c.course_end_date < CAST(GETDATE() AS date) THEN 1 ELSE 0 END),0) AS classes_finished,
        ISNULL(SUM(e.outstanding_balance),0) AS total_outstanding,
        ISNULL(MAX(paid.total_paid),0) AS total_paid,
        (SELECT TOP 1 p.name FROM StudentParents sp JOIN Parents p ON sp.parent_id = p.id WHERE sp.student_id = s.id) AS parent_name,
        (SELECT TOP 1 p.phone FROM StudentParents sp JOIN Parents p ON sp.parent_id = p.id WHERE sp.student_id = s.id) AS parent_phone
      FROM Students s
      LEFT JOIN Enrollments e ON e.student_id = s.id
      LEFT JOIN Classes c ON c.id = e.class_id
      LEFT JOIN (
        SELECT ee.student_id, SUM(pa.amount) AS total_paid FROM Payments pa JOIN Enrollments ee ON pa.enrollment_id = ee.id GROUP BY ee.student_id
      ) paid ON paid.student_id = s.id
      WHERE s.status IS NULL OR s.status <> 'disabled'
      GROUP BY s.id, s.name, s.phone
    `;

    // build filters for outer query (search, outstanding filters)
    const filters = [];
    const req = p.request();

    if (q && String(q).trim().length > 0) {
      const qLike = `%${String(q).trim()}%`;
      req.input('qLike', qLike);
      filters.push(`(name LIKE @qLike OR phone LIKE @qLike OR parent_name LIKE @qLike)`);
    }

    if (typeof minOutstanding !== 'undefined' && minOutstanding !== null && !Number.isNaN(Number(minOutstanding))) {
      req.input('minOutstanding', Number(minOutstanding));
      filters.push(`(total_outstanding >= @minOutstanding)`);
    }

    if (typeof maxOutstanding !== 'undefined' && maxOutstanding !== null && !Number.isNaN(Number(maxOutstanding))) {
      req.input('maxOutstanding', Number(maxOutstanding));
      filters.push(`(total_outstanding <= @maxOutstanding)`);
    }

    if (typeof hasDebt !== 'undefined' && hasDebt !== null) {
      if (hasDebt === true || String(hasDebt) === 'true') {
        filters.push(`(total_outstanding > 0)`);
      } else if (hasDebt === false || String(hasDebt) === 'false') {
        filters.push(`(total_outstanding = 0)`);
      }
    }

    const whereClause = filters.length > 0 ? (`WHERE ` + filters.join(' AND ')) : '';

    // sanitize sortField/sortDir
    const allowedSort = new Set(['name', 'phone', 'classes_active', 'classes_finished', 'total_outstanding', 'total_paid']);
    const sf = allowedSort.has(sortField) ? sortField : 'total_outstanding';
    const sd = String(sortDir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const pageNum = Math.max(1, Number(page) || 1);
    const ps = Math.max(1, Number(pageSize) || 20);
    const offset = (pageNum - 1) * ps;

    // total count query
    const countSql = `SELECT COUNT(1) AS total_count FROM (${baseAgg}) t ${whereClause};`;
    const countRes = await req.query(countSql);
    const total = (countRes && countRes.recordset && countRes.recordset[0] && countRes.recordset[0].total_count) ? Number(countRes.recordset[0].total_count) : 0;

    // paginated rows
    const rowsSql = `SELECT * FROM (${baseAgg}) t ${whereClause} ORDER BY ${sf} ${sd} OFFSET ${offset} ROWS FETCH NEXT ${ps} ROWS ONLY;`;
    const rowsRes = await req.query(rowsSql);
    const rows = rowsRes && rowsRes.recordset ? rowsRes.recordset : [];

    return { rows, total, page: pageNum, pageSize: ps };
  } catch (err) {
    console.error('[studentService] getStudentsDebtSummary error', err.message);
    throw err;
  }
}

module.exports.getStudentsDebtSummary = getStudentsDebtSummary;
