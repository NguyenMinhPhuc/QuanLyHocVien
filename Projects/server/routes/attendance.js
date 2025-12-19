const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Teacher flows
router.get('/my-classes', authenticateToken, requireRole('teacher', 'admin'), attendanceController.getMyClasses);
router.get('/class/:classId/students', authenticateToken, requireRole('teacher', 'admin'), attendanceController.getClassStudentsForDate);
router.post('/class/:classId/records', authenticateToken, requireRole('teacher', 'admin'), attendanceController.postClassAttendance);

module.exports = router;

