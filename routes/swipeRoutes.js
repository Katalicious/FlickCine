const express = require('express');
const router = express.Router();
const db = require('../db/db');
const tmdb = require('../services/tmdb');

router.get('/', (req, res) => {
    res.render('swipe');
});

router.get('/feed', async (req, res) => {
    try {
        const movies = await tmdb.getRandomMovies();
        res.json(movies);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar filmes' });
    }
});

router.post('/interaction', (req, res) => {
    const { tmdbId, title, poster, liked, disliked, overview, year } = req.body;
    console.log("--> RECEBI SWIPE!");
    console.log("User na Sessão:", req.session.user ? req.session.user.id : "Nenhum");
    console.log("Dados do Filme:", tmdbId, title, liked ? "(LIKE)" : "(DISLIKE)");

    if (!req.session || !req.session.user) {
        console.log("ERRO: Utilizador não logado.");
        return res.status(401).json({ success: false, message: "Não autorizado" });
    }
    const userId = req.session.user.id;

    if (!tmdbId) {
        console.log("ERRO: ID do filme em falta.");
        return res.status(400).json({ success: false });
    }

    try {
        const insertTransaction = db.transaction(() => {
            const insertMovie = db.prepare(`
                INSERT OR IGNORE INTO Filmes (tmbd_ID, Titulo, Capa, Sinopse) 
                VALUES (?, ?, ?, ?)
            `);
            insertMovie.run(tmdbId, title, poster, overview);

            const insertSwipe = db.prepare(`
                INSERT INTO Swipes (tmbd_ID, Utilizador_ID, liked, disliked, undo)
                VALUES (?, ?, ?, ?, 0)
            `);
            const info = insertSwipe.run(tmdbId, userId, liked, disliked);
            const swipeId = info.lastInsertRowid;

            console.log("Swipe inserido com ID:", swipeId);
            if (liked === 1) {
                const insertWatchlist = db.prepare(`
                    INSERT INTO Watchlist (Utilizador_ID, Swipe_ID)
                    VALUES (?, ?)
                `);
                insertWatchlist.run(userId, swipeId);
                console.log("--> Adicionado à Watchlist com sucesso!");
            }
        });

        insertTransaction();
        res.json({ success: true });
    } catch (err) {
        console.error("ERRO GRAVE NA TRANSACÇÃO:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;