const db = require('../db');

async function getAllNotifications() {
  const p = await db.getPool();
  const result = await p.request().execute('sp_notifications_get_all');
  return result.recordset;
}

async function getNotificationById(id) {
  const p = await db.getPool();
  const result = await p.request().input('id', id).execute('sp_notifications_get_by_id');
  return result.recordset[0];
}

async function createNotification(payload) {
  const { user_id, type, message } = payload;
  const p = await db.getPool();
  const req = p.request()
    .input('user_id', user_id)
    .input('type', type)
    .input('message', message);
  const result = await req.execute('sp_notifications_create');
  return result.recordset[0];
}

async function deleteNotification(id) {
  const p = await db.getPool();
  const result = await p.request().input('id', id).execute('sp_notifications_delete');
  return result.recordset[0];
}

module.exports = { getAllNotifications, getNotificationById, createNotification, deleteNotification };
