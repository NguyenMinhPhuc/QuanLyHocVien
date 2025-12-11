const express = require('express');
const router = express.Router();
const controller = require('../controllers/attendanceController');

router.get('/', controller.listAttendance);
router.get('/:id', controller.getAttendance);
router.post('/', controller.createAttendance);
router.put('/:id', controller.updateAttendance);
router.delete('/:id', controller.deleteAttendance);

module.exports = router;
