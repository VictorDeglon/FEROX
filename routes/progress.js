const express = require('express');
const router = express.Router();
const controller = require('../controllers/progressController');

router.get('/:userId', controller.get);
router.patch('/:userId', controller.update);

module.exports = router;
