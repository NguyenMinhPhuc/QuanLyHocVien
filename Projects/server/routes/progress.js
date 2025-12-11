const express = require('express');
const router = express.Router();
const controller = require('../controllers/progressController');

router.get('/', controller.listProgress);
router.get('/:id', controller.getProgress);
router.post('/', controller.createProgress);
router.put('/:id', controller.updateProgress);
router.delete('/:id', controller.deleteProgress);

module.exports = router;
