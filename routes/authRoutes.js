const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/login', (req, res) => {
    if (req.session.isLoggedIn) return res.redirect('/swipe');
    res.render('login');
});

router.get('/register', (req, res) => {
    if (req.session.isLoggedIn) return res.redirect('/swipe');
    res.render('register');
});

router.get('/profile', authMiddleware, authController.getProfile);
router.get('/avatar/:id', authController.getAvatarImage);
router.get('/update-avatar', authMiddleware, authController.updateAvatar);

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/logout', authController.logout);

module.exports = router;