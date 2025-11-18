const express = require('express');
const path = require('path');
const router = express.Router();

// Serve the swipe demo page
router.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, '..', 'public', 'swipe.html'));
});

module.exports = router;
