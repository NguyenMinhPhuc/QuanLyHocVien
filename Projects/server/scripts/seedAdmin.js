const bcrypt = require('bcryptjs');
const db = require('../db');
require('dotenv').config();

async function seedAdmin() {
  const defaultUsername = process.env.SEED_ADMIN_USERNAME || 'admin';
  const defaultPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
  const defaultRole = process.env.SEED_ADMIN_ROLE || 'administrator';
  const saltRounds = parseInt(process.env.SALT_ROUNDS || '10', 10);

  let pool;
  try {
    pool = await db.getPool();

    // Check if any users exist (COUNT) — avoid calling SP that needs params
    const countRes = await pool.request().query('SELECT COUNT(1) AS cnt FROM Users');
    const cnt = countRes.recordset && countRes.recordset[0] && countRes.recordset[0].cnt;

    if (cnt && cnt > 0) {
      console.log('Users table is not empty (count=' + cnt + '). Skipping seed.');
      return;
    }

    const salt = await bcrypt.genSalt(saltRounds);
    const hash = await bcrypt.hash(defaultPassword, salt);

    // Create admin via stored procedure
    const res = await pool.request()
      .input('username', defaultUsername)
      .input('password_hash', hash)
      .input('role', defaultRole)
      .execute('sp_users_create');

    const user = res.recordset && res.recordset[0];
    if (user) {
      console.log('Seed admin created:', { id: user.id, username: user.username, role: user.role });
    } else {
      console.log('Seed executed but no user returned.');
    }
  } catch (err) {
    console.error('Error while seeding admin:', err);
    process.exit(1);
  } finally {
    // optional: close pool
    try { if (pool) await pool.close(); } catch (e) { }
  }
}

if (require.main === module) {
  seedAdmin();
}

module.exports = { seedAdmin };
