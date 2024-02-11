const express = require('express');
const path = require('path');
const rootDir = require('../util/path');
const router = express.Router();



router.post('/login', (req, res, next) => {
	console.log(req.body);
	res.send('<h1>Game</h1>');
});

router.get('/', (req, res, next) => {
	res.sendFile(path.join(rootDir, 'views', 'player.html'));
	//res.send('<form action="/login" method="POST"><input type="text" name="login" /><input type="submit" value="Login" /></form>');
});

module.exports = router;