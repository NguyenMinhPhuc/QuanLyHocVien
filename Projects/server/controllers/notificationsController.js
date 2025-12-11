const notificationService = require('../services/notificationService');

async function listNotifications(req, res) {
  try {
    const rows = await notificationService.getAllNotifications();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function getNotification(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await notificationService.getNotificationById(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function createNotification(req, res) {
  try {
    const data = req.body;
    const created = await notificationService.createNotification(data);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function deleteNotification(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await notificationService.deleteNotification(id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

module.exports = { listNotifications, getNotification, createNotification, deleteNotification };
