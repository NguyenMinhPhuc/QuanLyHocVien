const express = require('express');
const router = express.Router();
const enrollments = require('../controllers/enrollmentsController');

// GET /api/classes/:classId/enrollments
router.get('/classes/:classId/enrollments', enrollments.listByClass);
// POST /api/classes/:classId/enrollments/sync
router.post('/classes/:classId/enrollments/sync', enrollments.syncEnrollments);
// POST /api/classes/:classId/enrollments
router.post('/classes/:classId/enrollments', enrollments.create);
// GET /api/enrollments/:id
router.get('/enrollments/:id', enrollments.getById);
// PUT /api/enrollments/:id
router.put('/enrollments/:id', enrollments.update);
// POST /api/enrollments/:id/transfer
router.post('/enrollments/:id/transfer', enrollments.transfer);
// POST /api/enrollments/:id/payments
router.post('/enrollments/:id/payments', enrollments.addPayment);
// GET /api/enrollments/:id/payments
router.get('/enrollments/:id/payments', enrollments.getPayments);
// POST /api/enrollments/:id/hold
router.post('/enrollments/:id/hold', enrollments.holdEnrollment);

module.exports = router;