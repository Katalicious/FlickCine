const express = require('express');
const router = express.Router();
const db = require('../db/db');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/remove', authMiddleware, (req, res) => {
    const { movieId } = req.body;
    const userId = req.session.user.id;

    try {
        const removeTransaction = db.transaction(() => {
            const swipe = db.prepare(`
                SELECT SWIPE_ID FROM Swipes 
                WHERE Utilizador_ID = ? AND tmbd_ID = ?
            `).get(userId, movieId);
            if (swipe) {
                db.prepare('DELETE FROM Watchlist WHERE Swipe_ID = ?').run(swipe.SWIPE_ID);
                db.prepare('UPDATE Swipes SET liked = 0, disliked = 0 WHERE SWIPE_ID = ?').run(swipe.SWIPE_ID);
            }
        });
        removeTransaction();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

module.exports = router;