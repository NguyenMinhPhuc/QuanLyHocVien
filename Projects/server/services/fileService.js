const { getPool, sql } = require('../db');

async function saveFile({ filename, mime_type, data, iv, auth_tag }) {
  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('filename', sql.NVarChar(255), filename);
    request.input('mime_type', sql.NVarChar(100), mime_type);
    request.input('data', sql.VarBinary(sql.MAX), data);
    request.input('iv', sql.VarBinary(16), iv);
    request.input('auth_tag', sql.VarBinary(16), auth_tag);
    const result = await request.query(`
      INSERT INTO Files (filename, mime_type, data, iv, auth_tag)
      VALUES (@filename, @mime_type, @data, @iv, @auth_tag);
      SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;
    `);
    const id = result && result.recordset && result.recordset[0] ? result.recordset[0].id : null;
    if (!id) {
      console.error('saveFile: insert returned no id', { filename, mime_type });
      return null;
    }
    return id;
  } catch (err) {
    console.error('saveFile error', err);
    throw err;
  }
}

async function getFileById(id) {
  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('id', sql.Int, id);
    const result = await request.query('SELECT id, filename, mime_type, data, iv, auth_tag, created_at FROM Files WHERE id = @id');
    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  } catch (err) {
    console.error('getFileById error', err);
    throw err;
  }
}

module.exports = { saveFile, getFileById };
