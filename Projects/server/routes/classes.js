const express = require('express');
const router = express.Router();
const controller = require('../controllers/classesController');

router.get('/', controller.listClasses);
router.get('/active', controller.getActiveClasses);
router.get('/course/:courseId/active', controller.getActiveByCourse);
router.get('/:id', controller.getClass);
router.get('/:id/students', controller.getClassStudents);
router.get('/:id/teachers', controller.getClassTeachers);
router.post('/', controller.createClass);
router.post('/:id/students', controller.addStudentToClass);
router.post('/:id/teachers', controller.addTeacherToClass);
router.put('/:id', controller.updateClass);
router.delete('/:id/students/:studentId', controller.removeStudentFromClass);
router.delete('/:id/teachers/:teacherId', controller.removeTeacherFromClass);
router.delete('/:id', controller.deleteClass);

module.exports = router;
