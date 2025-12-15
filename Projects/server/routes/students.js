const express = require('express');
const router = express.Router();
const controller = require('../controllers/studentsController');
const { body, param, validationResult } = require('express-validator');

// Routes follow MVC: controller handles request, service calls stored procedures
router.get('/', controller.listStudents);
router.get('/debts', controller.debtSummary);
router.get('/:id',
  param('id').isInt().withMessage('id must be integer'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    return controller.getStudent(req, res, next);
  }
);

router.get('/:id/enrollments',
  param('id').isInt().withMessage('id must be integer'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    return controller.enrollmentsByStudent(req, res, next);
  }
);

router.post('/',
  body('name').isLength({ min: 1 }).withMessage('name is required'),
  body('email').optional().isEmail().withMessage('invalid email'),
  body('dob').optional().isISO8601().withMessage('invalid dob'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    return controller.createStudent(req, res, next);
  }
);

router.put('/:id',
  param('id').isInt().withMessage('id must be integer'),
  body('email').optional().isEmail().withMessage('invalid email'),
  body('dob').optional().isISO8601().withMessage('invalid dob'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    return controller.updateStudent(req, res, next);
  }
);

router.delete('/:id',
  param('id').isInt().withMessage('id must be integer'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    return controller.deleteStudent(req, res, next);
  }
);

router.post('/:id/pay',
  param('id').isInt().withMessage('id must be integer'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    return controller.payDebt(req, res, next);
  }
);

module.exports = router;
