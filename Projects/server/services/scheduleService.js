const db = require('../db');

async function getAllSchedules() {
  const p = await db.getPool();
  const result = await p.request().execute('sp_schedules_get_all');
  return result.recordset;
}

async function getScheduleById(id) {
  const p = await db.getPool();
  const result = await p.request().input('id', id).execute('sp_schedules_get_by_id');
  return result.recordset[0];
}

async function createSchedule(payload) {
  const { class_id, weekday, start_time, end_time } = payload;
  const p = await db.getPool();
  const req = p.request()
    .input('class_id', class_id)
    .input('weekday', weekday)
    .input('start_time', start_time)
    .input('end_time', end_time);
  const result = await req.execute('sp_schedules_create');
  return result.recordset[0];
}

async function updateSchedule(id, payload) {
  const { class_id, weekday, start_time, end_time } = payload;
  const p = await db.getPool();
  const req = p.request()
    .input('id', id)
    .input('class_id', class_id)
    .input('weekday', weekday)
    .input('start_time', start_time)
    .input('end_time', end_time);
  const result = await req.execute('sp_schedules_update');
  return result.recordset[0];
}

async function deleteSchedule(id) {
  const p = await db.getPool();
  const result = await p.request().input('id', id).execute('sp_schedules_delete');
  return result.recordset[0];
}

module.exports = { getAllSchedules, getScheduleById, createSchedule, updateSchedule, deleteSchedule };
