const express = require('express');
const path = require('path');
const rootDir = require('../util/path');
const router = express.Router();

router.get('/admin', (req, res, next) => {
	res.sendFile(path.join(rootDir, 'views', 'admin.html'));
	//res.send('<h1>Admin</h1>');
});

router.post('/restart-level', (req, res, next) => {
	res.send('<h1>Restart level</h1>');
});

module.exports = router;