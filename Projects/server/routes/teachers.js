const express = require('express');
const router = express.Router();
const controller = require('../controllers/teachersController');

router.get('/', controller.listTeachers);
router.get('/:id', controller.getTeacher);
router.post('/', controller.createTeacher);
router.put('/:id', controller.updateTeacher);
router.delete('/:id', controller.deleteTeacher);

module.exports = router;
