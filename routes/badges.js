const express = require('express');
const router = express.Router();
const controller = require('../controllers/badgesController');

router.get('/', controller.getAll);
router.post('/:id/unlock', controller.unlock);

module.exports = router;
