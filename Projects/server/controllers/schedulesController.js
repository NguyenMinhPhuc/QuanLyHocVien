const scheduleService = require('../services/scheduleService');

async function listSchedules(req, res) {
  try {
    const rows = await scheduleService.getAllSchedules();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function getSchedule(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await scheduleService.getScheduleById(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function createSchedule(req, res) {
  try {
    const data = req.body;
    const created = await scheduleService.createSchedule(data);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function updateSchedule(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    const updated = await scheduleService.updateSchedule(id, data);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function deleteSchedule(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await scheduleService.deleteSchedule(id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

module.exports = { listSchedules, getSchedule, createSchedule, updateSchedule, deleteSchedule };
