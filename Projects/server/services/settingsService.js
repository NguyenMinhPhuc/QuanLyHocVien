const db = require('../db');

async function getSettings(keys = []) {
  const p = await db.getPool();
  if (!keys || keys.length === 0) {
    const r = await p.request().query('SELECT [key],[value] FROM AppSettings');
    const rows = r.recordset || [];
    return rows.reduce((acc, row) => { acc[row.key] = row.value; return acc; }, {});
  }
  // fetch specific keys
  const params = keys.map((k, i) => `@k${i}`).join(',');
  const req = p.request();
  keys.forEach((k, i) => req.input(`k${i}`, k));
  const q = `SELECT [key],[value] FROM AppSettings WHERE [key] IN (${keys.map((_, i) => `@k${i}`).join(',')})`;
  const r = await req.query(q);
  const rows = r.recordset || [];
  return rows.reduce((acc, row) => { acc[row.key] = row.value; return acc; }, {});
}

async function setSettings(map) {
  const p = await db.getPool();
  const tx = p.transaction();
  await tx.begin();
  try {
    const request = tx.request();
    for (const [k, v] of Object.entries(map)) {
      await request.query(`IF EXISTS (SELECT 1 FROM AppSettings WHERE [key] = '${k}') UPDATE AppSettings SET [value] = '${String(v).replace("'", "''")}' WHERE [key] = '${k}' ELSE INSERT INTO AppSettings([key],[value]) VALUES('${k}','${String(v).replace("'", "''")}')`);
    }
    await tx.commit();
    return true;
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

module.exports = { getSettings, setSettings };
