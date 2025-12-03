const express = require('express');
const router = express.Router();
const db = require('../db/db');
const tmdb = require('../services/tmdb');
const genresMovie = require('../genres.json');
const genresTV = require('../genres_series.json');
const allGenres = [...genresMovie, ...genresTV]; 

router.get('/', (req, res) => {
    res.render('swipe');
});

router.get('/feed', async (req, res) => {
    try {
        if (!req.session || !req.session.user) return res.status(401).json({ error: 'Não autorizado' });
        const userId = req.session.user.id;

        const hoje = new Date().toLocaleDateString('pt-PT');
        if (req.session.lastVisitDate !== hoje) {
            db.prepare('UPDATE Utilizador SET Swipes_Restantes = 30 WHERE Utilizador_ID = ?').run(userId);
            req.session.lastVisitDate = hoje;
        }

        const user = db.prepare('SELECT Swipes_Restantes FROM Utilizador WHERE Utilizador_ID = ?').get(userId);
        const pendingSwipes = db.prepare(`
            SELECT tmbd_ID FROM Swipes 
            WHERE Utilizador_ID = ? AND liked = 0 AND disliked = 0
        `).all(userId);
        
        let movies = [];

        if (pendingSwipes.length > 0) {
            console.log(`User ${userId}: A recuperar fila.`);
            const ids = pendingSwipes.map(row => row.tmbd_ID);
            movies = await tmdb.getMoviesFromIds(ids);

        } else {
            console.log(`User ${userId}: A calcular recomendações...`);
            
            if (user.Swipes_Restantes <= 0) return res.json({ limitReached: true, swipesRemaining: 0 });

            const history = db.prepare(`
                SELECT s.tmbd_ID, f.Generos 
                FROM Swipes s
                JOIN "Filmes/séries" f ON s.tmbd_ID = f.tmbd_ID
                WHERE s.Utilizador_ID = ?
            `).all(userId);
            const excludedIds = history.map(row => row.tmbd_ID);
            const likedMovies = db.prepare(`
                SELECT f.Generos FROM Swipes s
                JOIN "Filmes/séries" f ON s.tmbd_ID = f.tmbd_ID
                WHERE s.Utilizador_ID = ? AND s.liked = 1
            `).all(userId);

            let genreCounts = {};
            likedMovies.forEach(m => {
                if (m.Generos) {
                    const list = m.Generos.split(',').map(g => g.trim());
                    list.forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; });
                }
            });
            let topGenreName = null;
            let maxCount = 0;
            for (const [name, count] of Object.entries(genreCounts)) {
                if (count > maxCount) {
                    maxCount = count;
                    topGenreName = name;
                }
            }

            let topGenreId = null;
            if (topGenreName) {
                const cleanName = topGenreName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                
                const match = allGenres.find(g => 
                    g.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === cleanName
                );
                
                if (match) {
                    topGenreId = match.id;
                    console.log(`--> Algoritmo: Género Favorito é "${topGenreName}" (ID: ${topGenreId}) com ${maxCount} likes.`);
                }
            }
            movies = await tmdb.getRandomMovies(excludedIds, topGenreId);

            const insertTransaction = db.transaction((movieList) => {
                const stmtMovie = db.prepare(`
                    INSERT OR IGNORE INTO "Filmes/séries" (
                        "tmbd_ID", "Titulo", "Capa", "Sinopse", 
                        "Data_de_Lançamento", "Rating", "Generos", 
                        "Duração", "Providers", "Atores", 
                        "Produtores", "Trailer"
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                
                const stmtSwipe = db.prepare(`
                    INSERT INTO Swipes (tmbd_ID, Utilizador_ID, liked, disliked, undo)
                    VALUES (?, ?, 0, 0, 0)
                `);

                for (const m of movieList) {
                    const providersStr = m.providers ? JSON.stringify(m.providers) : '{}';
                    stmtMovie.run(
                        m.id, m.title, m.poster, m.description, m.full_date, 
                        m.rating, m.genres, m.runtime, providersStr, m.cast, 
                        m.producers, m.trailerLink || ''
                    );
                    stmtSwipe.run(m.id, userId);
                }
            });
            
            insertTransaction(movies);
        }
        
        res.json({ movies, swipesRemaining: user.Swipes_Restantes });

    } catch (err) {
        console.error("Erro no feed:", err);
        res.status(500).json({ error: 'Erro ao buscar filmes' });
    }
});

router.post('/interaction', (req, res) => {
    const { tmdbId, title, poster, liked, disliked, overview, year } = req.body; 
    const userId = req.session.user.id;

    if (!tmdbId) return res.status(400).json({ success: false });

    try {
        const transaction = db.transaction(() => {
            const user = db.prepare('SELECT Swipes_Restantes FROM Utilizador WHERE Utilizador_ID = ?').get(userId);
            if (user.Swipes_Restantes <= 0) throw new Error("LIMIT_REACHED");

            const update = db.prepare(`
                UPDATE Swipes SET liked = ?, disliked = ? 
                WHERE Utilizador_ID = ? AND tmbd_ID = ?
            `);
            const info = update.run(liked, disliked, userId, tmdbId);

            if (info.changes === 0) {
                 db.prepare(`
                    INSERT OR IGNORE INTO "Filmes/séries" ("tmbd_ID", "Titulo", "Capa", "Sinopse", "Data_de_Lançamento") 
                    VALUES (?, ?, ?, ?, ?)
                `).run(tmdbId, title, poster, overview, year);

                 db.prepare(`
                    INSERT INTO Swipes (tmbd_ID, Utilizador_ID, liked, disliked, undo)
                    VALUES (?, ?, ?, ?, 0)
                `).run(tmdbId, userId, liked, disliked);
            }

            if (liked === 1) {
                const swipe = db.prepare(`SELECT SWIPE_ID FROM Swipes WHERE Utilizador_ID = ? AND tmbd_ID = ?`).get(userId, tmdbId);
                if(swipe) db.prepare(`INSERT OR IGNORE INTO Watchlist (Utilizador_ID, Swipe_ID) VALUES (?, ?)`).run(userId, swipe.SWIPE_ID);
            }

            db.prepare('UPDATE Utilizador SET Swipes_Restantes = Swipes_Restantes - 1 WHERE Utilizador_ID = ?').run(userId);
        });

        transaction();
        const updatedUser = db.prepare('SELECT Swipes_Restantes FROM Utilizador WHERE Utilizador_ID = ?').get(userId);
        res.json({ success: true, swipesRemaining: updatedUser.Swipes_Restantes });

    } catch (err) {
        if (err.message === "LIMIT_REACHED") return res.json({ success: false, limitReached: true });
        console.error("Erro interaction:", err);
        res.status(500).json({ success: false });
    }
});

router.post('/undo', (req, res) => {
    const userId = req.session.user.id;
    try {
        const undoTransaction = db.transaction(() => {
            const lastSwipe = db.prepare(`SELECT SWIPE_ID, liked FROM Swipes WHERE Utilizador_ID = ? AND (liked=1 OR disliked=1) ORDER BY SWIPE_ID DESC LIMIT 1`).get(userId);
            if (!lastSwipe) return;

            if (lastSwipe.liked === 1) db.prepare('DELETE FROM Watchlist WHERE Swipe_ID = ?').run(lastSwipe.SWIPE_ID);
            db.prepare(`UPDATE Swipes SET liked = 0, disliked = 0 WHERE SWIPE_ID = ?`).run(lastSwipe.SWIPE_ID);
            db.prepare('UPDATE Utilizador SET Swipes_Restantes = Swipes_Restantes + 1 WHERE Utilizador_ID = ?').run(userId);
        });
        undoTransaction();
        const updatedUser = db.prepare('SELECT Swipes_Restantes FROM Utilizador WHERE Utilizador_ID = ?').get(userId);
        res.json({ success: true, swipesRemaining: updatedUser.Swipes_Restantes });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;