const db = require('../db');

async function getReceiptById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'id required' });
    const p = await db.getPool();
    const result = await p.request().input('id', id).query('SELECT * FROM Receipts WHERE id = @id');
    const row = result.recordset && result.recordset[0];
    if (!row) return res.status(404).json({ error: 'Receipt not found' });

    // parse stored JSON data
    let details = null;
    try { details = JSON.parse(row.data); } catch (e) { details = null; }

    // enrich student phone if enrollment present
    if (row.enrollment_id) {
      try {
        const r2 = await p.request().input('id', row.enrollment_id).query('SELECT e.student_id, s.name AS student_name, s.phone AS student_phone FROM Enrollments e LEFT JOIN Students s ON s.id = e.student_id WHERE e.id = @id');
        const er = r2.recordset && r2.recordset[0];
        if (er) {
          details = details || {};
          details.student_phone = er.student_phone || details.student_phone;
          details.student_name = details.student_name || er.student_name;
        }
      } catch (e) { console.error('failed to load student phone for receipt', e); }
    }

    // load settings for receipt header
    let settings = {};
    try {
      const sres = await p.request().query("SELECT [key],[value] FROM AppSettings WHERE [key] IN ('receipt_logo_url','receipt_center_phone')");
      const srows = sres.recordset || [];
      settings = srows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});
    } catch (e) { console.error('failed to load settings for receipt', e); }

    res.json({ receipt: row, details, settings });
  } catch (err) {
    console.error('receipts.getReceiptById error', err);
    res.status(500).json({ error: err.message || 'Database error' });
  }
}

module.exports = { getReceiptById };
