const express = require('express');
const router = express.Router();

// Placeholder route handlers for /auth
router.get('/', (req, res) => {
	res.send('Auth root');
});

module.exports = router;
