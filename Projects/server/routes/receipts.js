const express = require('express');
const router = express.Router();
const receipts = require('../controllers/receiptsController');

// GET /api/receipts/:id
router.get('/:id', receipts.getReceiptById);

module.exports = router;
