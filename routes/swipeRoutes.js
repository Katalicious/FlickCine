const express = require('express');
const router = express.Router();
const db = require('../db/db');
const tmdb = require('../services/tmdb');

router.get('/', (req, res) => {
    res.render('swipe');
});
router.get('/feed', async (req, res) => {
    try {
        if (!req.session || !req.session.user) return res.status(401).json({ error: 'Não autorizado' });
        const userId = req.session.user.id;
        const pendingSwipes = db.prepare(`
            SELECT tmbd_ID FROM Swipes 
            WHERE Utilizador_ID = ? AND liked = 0 AND disliked = 0
        `).all(userId);
        
        let movies = [];

        if (pendingSwipes.length > 0) {
            console.log(`User ${userId} tem ${pendingSwipes.length} filmes pendentes.`);
            const ids = pendingSwipes.map(row => row.tmbd_ID);
            movies = await tmdb.getMoviesFromIds(ids);

        } else {
            console.log(`User ${userId} precisa de novos filmes.`);
            const history = db.prepare(`
                SELECT tmbd_ID FROM Swipes 
                WHERE Utilizador_ID = ? AND (liked = 1 OR disliked = 1)
            `).all(userId);
            const excludedIds = history.map(row => row.tmbd_ID);
            movies = await tmdb.getRandomMovies(excludedIds);
            const insertPending = db.transaction((movieList) => {
                const stmtMovie = db.prepare(`
                    INSERT OR IGNORE INTO "Filmes/séries" (tmbd_ID, Titulo, Capa, Sinopse, Data_de_Lan√ßamento) 
                    VALUES (?, ?, ?, ?, ?)
                `);
                
                const stmtSwipe = db.prepare(`
                    INSERT INTO Swipes (tmbd_ID, Utilizador_ID, liked, disliked, undo)
                    VALUES (?, ?, 0, 0, 0)
                `);

                for (const m of movieList) {
                    stmtMovie.run(m.id, m.title, m.poster, m.description, m.year);
                    stmtSwipe.run(m.id, userId);
                }
            });
            
            insertPending(movies);
        }
        
        res.json(movies);

    } catch (err) {
        console.error("Erro no feed:", err);
        res.status(500).json({ error: 'Erro ao buscar filmes' });
    }
});

router.post('/interaction', (req, res) => {
    const { tmdbId, title, poster, liked, disliked, overview, year } = req.body;
    
    if (!req.session || !req.session.user) return res.status(401).json({ success: false });
    const userId = req.session.user.id;

    if (!tmdbId) return res.status(400).json({ success: false });

    try {
        const updateTransaction = db.transaction(() => {
            const existingSwipe = db.prepare(`
                SELECT SWIPE_ID FROM Swipes 
                WHERE Utilizador_ID = ? AND tmbd_ID = ? AND liked = 0 AND disliked = 0
            `).get(userId, tmdbId);

            let swipeId;

            if (existingSwipe) {
                db.prepare(`
                    UPDATE Swipes SET liked = ?, disliked = ? 
                    WHERE SWIPE_ID = ?
                `).run(liked, disliked, existingSwipe.SWIPE_ID);
                swipeId = existingSwipe.SWIPE_ID;
            } else {
                const info = db.prepare(`
                    INSERT INTO Swipes (tmbd_ID, Utilizador_ID, liked, disliked, undo)
                    VALUES (?, ?, ?, ?, 0)
                `).run(tmdbId, userId, liked, disliked);
                swipeId = info.lastInsertRowid;
            }

            if (liked === 1) {
                db.prepare(`INSERT OR IGNORE INTO Watchlist (Utilizador_ID, Swipe_ID) VALUES (?, ?)`).run(userId, swipeId);
            }
        });

        updateTransaction();
        res.json({ success: true });
    } catch (err) {
        console.error("Erro no swipe:", err);
        res.status(500).json({ success: false });
    }
});

router.post('/undo', (req, res) => {
    if (!req.session || !req.session.user) return res.status(401).json({ success: false });
    const userId = req.session.user.id;

    try {
        const undoTransaction = db.transaction(() => {
            const lastSwipe = db.prepare(`
                SELECT SWIPE_ID, liked FROM Swipes 
                WHERE Utilizador_ID = ? AND (liked = 1 OR disliked = 1)
                ORDER BY SWIPE_ID DESC LIMIT 1
            `).get(userId);

            if (!lastSwipe) return;
            if (lastSwipe.liked === 1) {
                db.prepare('DELETE FROM Watchlist WHERE Swipe_ID = ?').run(lastSwipe.SWIPE_ID);
            }
            db.prepare(`
                UPDATE Swipes SET liked = 0, disliked = 0 
                WHERE SWIPE_ID = ?
            `).run(lastSwipe.SWIPE_ID);
        });

        undoTransaction();
        res.json({ success: true });
    } catch (err) {
        console.error("Erro no undo:", err);
        res.status(500).json({ success: false });
    }
});

module.exports = router;