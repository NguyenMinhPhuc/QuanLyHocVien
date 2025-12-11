const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationsController');

router.get('/', controller.listNotifications);
router.get('/:id', controller.getNotification);
router.post('/', controller.createNotification);
router.delete('/:id', controller.deleteNotification);

module.exports = router;
