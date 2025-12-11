const db = require('../db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10', 10);

async function getAllTeachers() {
  const p = await db.getPool();
  const result = await p.request().execute('sp_teachers_get_all');
  return result.recordset;
}

async function getTeacherById(id) {
  const p = await db.getPool();
  const result = await p.request().input('id', id).execute('sp_teachers_get_by_id');
  return result.recordset[0];
}

async function createTeacher(payload) {
  const { name, phone, email, status } = payload;
  const p = await db.getPool();

  // helper to ensure unique username
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

  // determine username base (local-part of email) or fallback to name
  let usernameBase = 'teacher';
  if (email && typeof email === 'string' && email.includes('@')) {
    usernameBase = email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
  } else if (name) {
    usernameBase = name.split(' ').join('.').replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
  }

  const username = await ensureUniqueUsername(usernameBase, p);
  const passwordRaw = `${username}@123`;
  const hash = await bcrypt.hash(passwordRaw, await bcrypt.genSalt(SALT_ROUNDS));

  // create user record
  const userRes = await p.request()
    .input('username', username)
    .input('password_hash', hash)
    .input('role', 'teacher')
    .execute('sp_users_create');
  const createdUser = userRes.recordset && userRes.recordset[0];

  // create teacher record and link to created user
  const req = p.request()
    .input('name', name)
    .input('phone', phone)
    .input('email', email)
    .input('user_id', createdUser && createdUser.id)
    .input('status', status || 'active');
  const result = await req.execute('sp_teachers_create');
  const teacher = result.recordset[0];

  return { teacher, user: { id: createdUser && createdUser.id, username, password: passwordRaw } };
}

async function updateTeacher(id, payload) {
  const { name, phone, email, status, user_id } = payload;
  const p = await db.getPool();
  const tx = await p.transaction();
  try {
    await tx.begin();

    const req = tx.request()
      .input('id', id)
      .input('name', name)
      .input('phone', phone)
      .input('email', email)
      .input('user_id', user_id)
      .input('status', status);
    const result = await req.execute('sp_teachers_update');
    const updated = result.recordset && result.recordset[0];

    // If status provided, mirror to linked Users.status
    if (typeof status !== 'undefined' && status !== null) {
      // determine desired user status: active -> active, otherwise -> disabled
      const userStatus = (status === 'active') ? 'active' : 'disabled';

      // find linked user id from updated teacher row or fallback lookup
      let linkedUserId = updated && updated.user_id;
      if (!linkedUserId) {
        // try to derive from email local-part
        const teacherEmail = updated && updated.email;
        if (teacherEmail && teacherEmail.includes('@')) {
          const username = teacherEmail.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
          const uRes = await tx.request().input('username', username).execute('sp_users_get_by_username');
          const userRow = uRes.recordset && uRes.recordset[0];
          if (userRow && userRow.id) linkedUserId = userRow.id;
        }
      }

      if (linkedUserId) {
        await tx.request().input('user_id', linkedUserId).input('status', userStatus).query('UPDATE Users SET status = @status WHERE id = @user_id');
      }
    }

    await tx.commit();
    return updated;
  } catch (err) {
    try { await tx.rollback(); } catch (e) { /* ignore */ }
    throw err;
  }
}
async function deleteTeacher(id) {
  const p = await db.getPool();
  const tx = await p.transaction();
  try {
    await tx.begin();

    // fetch teacher to get linked user_id (if present)
    const tRes = await tx.request().input('id', id).execute('sp_teachers_get_by_id');
    const teacher = tRes.recordset && tRes.recordset[0];

    // mark teacher as inactive
    await tx.request().input('id', id).input('status', 'inactive').query('UPDATE Teachers SET status = @status WHERE id = @id');

    // if we have a linked user_id, disable that user
    if (teacher && teacher.user_id) {
      await tx.request().input('user_id', teacher.user_id).input('status', 'disabled').query('UPDATE Users SET status = @status WHERE id = @user_id');
    } else if (teacher && teacher.email) {
      // fallback: try to find user by username derived from email local-part
      const local = (teacher.email || '').includes('@') ? teacher.email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase() : null;
      if (local) {
        const uRes = await tx.request().input('username', local).execute('sp_users_get_by_username');
        const user = uRes.recordset && uRes.recordset[0];
        if (user && user.id) {
          await tx.request().input('user_id', user.id).input('status', 'disabled').query('UPDATE Users SET status = @status WHERE id = @user_id');
        }
      }
    }

    await tx.commit();
    return { success: true };
  } catch (err) {
    try { await tx.rollback(); } catch (e) { /* ignore */ }
    throw err;
  }
}

module.exports = { getAllTeachers, getTeacherById, createTeacher, updateTeacher, deleteTeacher };
