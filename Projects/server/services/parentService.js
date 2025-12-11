const db = require('../db');

async function disableParentAndUnlink(parentId) {
  const p = await db.getPool();
  const tx = await p.transaction();
  try {
    await tx.begin();

    // get parent record to find linked user
    const parentRes = await tx.request().input('id', parentId).query('SELECT id, user_id FROM Parents WHERE id = @id');
    const parent = parentRes.recordset && parentRes.recordset[0];

    // unlink parent from any students
    await tx.request().input('parent_id', parentId).query('DELETE FROM StudentParents WHERE parent_id = @parent_id');

    // mark parent record as disabled
    await tx.request().input('id', parentId).input('status', 'disabled').query("UPDATE Parents SET status = @status WHERE id = @id");

    // disable corresponding user account if exists
    if (parent && parent.user_id) {
      await tx.request().input('user_id', parent.user_id).input('status', 'disabled').query("UPDATE Users SET status = @status WHERE id = @user_id");
    }

    await tx.commit();
    return { success: true };
  } catch (err) {
    try { await tx.rollback(); } catch (e) { /* ignore */ }
    throw err;
  }
}

module.exports = { disableParentAndUnlink };
