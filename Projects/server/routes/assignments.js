const express = require('express');
const router = express.Router();
const controller = require('../controllers/assignmentsController');

router.get('/', controller.listAssignments);
router.get('/:id', controller.getAssignment);
router.post('/', controller.createAssignment);
router.put('/:id', controller.updateAssignment);
router.delete('/:id', controller.deleteAssignment);

module.exports = router;
