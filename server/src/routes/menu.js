'use strict';

const express = require('express');
const { listMenuItems, getMenuItem } = require('../controllers/menuController');

const router = express.Router();

router.get('/',    listMenuItems);
router.get('/:id', getMenuItem);

module.exports = router;
