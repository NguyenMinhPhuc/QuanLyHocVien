const express = require('express');
const router = express.Router();
const controller = require('../controllers/schedulesController');

router.get('/', controller.listSchedules);
router.get('/export.ics', controller.exportIcs);
router.post('/:id/copy', controller.copySchedule);
router.get('/:id', controller.getSchedule);
router.post('/', controller.createSchedule);
router.put('/:id', controller.updateSchedule);
router.delete('/:id', controller.deleteSchedule);

module.exports = router;
