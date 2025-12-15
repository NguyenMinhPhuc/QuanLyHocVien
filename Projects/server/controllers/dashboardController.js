const dashboardService = require('../services/dashboardService');

async function getDashboard(req, res) {
  try {
    const stats = await dashboardService.getStats();
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
}

async function getRevenue(req, res) {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const classId = req.query.classId ? parseInt(req.query.classId, 10) : null;
    const rows = await dashboardService.getMonthlyRevenue(year, classId);
    res.json({ year, rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch revenue' });
  }
}

module.exports = { getDashboard, getRevenue };
