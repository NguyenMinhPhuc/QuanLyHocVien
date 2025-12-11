const express = require('express');
const router = express.Router();
const controller = require('../controllers/submissionsController');

router.get('/', controller.listSubmissions);
router.get('/:id', controller.getSubmission);
router.post('/', controller.createSubmission);
router.put('/:id', controller.updateSubmission);
router.delete('/:id', controller.deleteSubmission);

module.exports = router;
