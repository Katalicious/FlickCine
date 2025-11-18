const express = require('express');
const router = express.Router();
const path = require('path');

// detalhes de cada filme ou série render com o ejs
router.get('/', (req, res) => {
	res.send('Details root');
});

module.exports = router;