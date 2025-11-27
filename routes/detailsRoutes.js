const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/:id', authMiddleware, (req, res) => {
    res.render('details', { 
        movieId: req.params.id,
        page: 'details'
    });
});

module.exports = router;