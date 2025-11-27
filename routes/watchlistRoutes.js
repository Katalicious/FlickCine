const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
	res.send('Watchlist root');
});

module.exports = router;
