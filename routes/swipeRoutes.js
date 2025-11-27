const express = require('express');
const router = express.Router();
const db = require('../db/db');
const tmdb = require('../services/tmdb');

router.get('/', (req, res) => {
    res.render('swipe');
});

router.get('/feed', async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ error: 'Não autorizado' });
        }
        const userId = req.session.user.id;

        const history = db.prepare('SELECT tmbd_ID FROM Swipes WHERE Utilizador_ID = ?').all(userId);
        const excludedIds = history.map(row => row.tmbd_ID);

        const movies = await tmdb.getRandomMovies(excludedIds);
        
        res.json(movies);
    } catch (err) {
        console.error("Erro no feed:", err);
        res.status(500).json({ error: 'Erro ao buscar filmes' });
    }
});

router.post('/interaction', (req, res) => {
    const { tmdbId, title, poster, liked, disliked, overview, year } = req.body;
    
    if (!req.session || !req.session.user) {
        return res.status(401).json({ success: false, message: "Não autorizado" });
    }
    const userId = req.session.user.id;

    if (!tmdbId) return res.status(400).json({ success: false });

    try {
        const insertTransaction = db.transaction(() => {

            const insertMovie = db.prepare(`
                INSERT OR IGNORE INTO "Filmes/séries" 
                (tmbd_ID, Titulo, Capa, Sinopse, Data_de_Lan√ßamento) 
                VALUES (?, ?, ?, ?, ?)
            `);
            insertMovie.run(tmdbId, title, poster, overview, year);

            const insertSwipe = db.prepare(`
                INSERT INTO Swipes (tmbd_ID, Utilizador_ID, liked, disliked, undo)
                VALUES (?, ?, ?, ?, 0)
            `);
            const info = insertSwipe.run(tmdbId, userId, liked, disliked);
            const swipeId = info.lastInsertRowid;

            if (liked === 1) {
                const insertWatchlist = db.prepare(`
                    INSERT INTO Watchlist (Utilizador_ID, Swipe_ID)
                    VALUES (?, ?)
                `);
                insertWatchlist.run(userId, swipeId);
            }
        });

        insertTransaction();
        res.json({ success: true });
    } catch (err) {
        console.error("Erro no swipe:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/undo', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ success: false });
    }
    const userId = req.session.user.id;

    try {
        const undoTransaction = db.transaction(() => {
            const lastSwipe = db.prepare(`
                SELECT SWIPE_ID, liked FROM Swipes 
                WHERE Utilizador_ID = ? 
                ORDER BY SWIPE_ID DESC LIMIT 1
            `).get(userId);

            if (!lastSwipe) return;
            if (lastSwipe.liked === 1) {
                db.prepare('DELETE FROM Watchlist WHERE Swipe_ID = ?').run(lastSwipe.SWIPE_ID);
            }

            db.prepare('DELETE FROM Swipes WHERE SWIPE_ID = ?').run(lastSwipe.SWIPE_ID);
        });

        undoTransaction();
        console.log(`Undo realizado para o user ${userId}`);
        res.json({ success: true });

    } catch (err) {
        console.error("Erro no undo:", err);
        res.status(500).json({ success: false });
    }
});

module.exports = router;