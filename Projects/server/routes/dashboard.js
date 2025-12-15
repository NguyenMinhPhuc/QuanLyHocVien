const express = require('express');
const router = express.Router();
const controller = require('../controllers/dashboardController');

router.get('/', controller.getDashboard);
router.get('/revenue', controller.getRevenue);

module.exports = router;
