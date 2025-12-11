const express = require('express');
const router = express.Router();
const controller = require('../controllers/coursesController');

router.get('/', controller.listCourses);
router.get('/:id', controller.getCourse);
router.post('/', controller.createCourse);
router.put('/:id', controller.updateCourse);
router.delete('/:id', controller.deleteCourse);

module.exports = router;
