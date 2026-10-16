'use strict';

const express = require('express');
const { placeOrder, getOrder } = require('../controllers/orderController');

const router = express.Router();

router.post('/',             placeOrder);
router.get('/:orderNumber',  getOrder);

module.exports = router;
