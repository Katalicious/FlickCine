const express = require('express');
const router = express.Router();
const db = require('../db/db');
const tmdb = require('../services/tmdb');

router.get('/', (req, res) => {
    res.render('swipe');
});

// --- ROTA DE FEED ---
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
            console.log(`User ${userId}: Recuperando ${pendingSwipes.length} filmes da fila.`);
            const ids = pendingSwipes.map(row => row.tmbd_ID);
            movies = await tmdb.getMoviesFromIds(ids);

        } else {
            if (user.Swipes_Restantes <= 0) return res.json({ limitReached: true, swipesRemaining: 0 });

            const history = db.prepare(`
                SELECT tmbd_ID FROM Swipes 
                WHERE Utilizador_ID = ? AND (liked = 1 OR disliked = 1)
            `).all(userId);
            const excludedIds = history.map(row => row.tmbd_ID);

            movies = await tmdb.getRandomMovies(excludedIds);

            const insertTransaction = db.transaction((movieList) => {

                const stmtMovie = db.prepare(`
                    INSERT OR IGNORE INTO "Filmes/séries" (
                        tmbd_ID, Titulo, Capa, Sinopse, 
                        Data_de_Lançamento, Rating, Generos, 
                        Duração, Providers, Atores, 
                        Produtores, Trailer
                    ) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                
                const stmtSwipe = db.prepare(`
                    INSERT INTO Swipes (tmbd_ID, Utilizador_ID, liked, disliked, undo)
                    VALUES (?, ?, 0, 0, 0)
                `);

                for (const m of movieList) {
                    const providersStr = m.providers ? JSON.stringify(m.providers) : '{}';

                    stmtMovie.run(
                        m.id, 
                        m.title, 
                        m.poster, 
                        m.description, 
                        m.full_date,    
                        m.rating,       
                        m.genres,       
                        m.runtime,      
                        providersStr,   
                        m.cast,         
                        m.producers,    
                        m.trailerLink || '' 
                    );
                    
                    stmtSwipe.run(m.id, userId);
                }
            });
            
            insertTransaction(movies);
        }
        
        res.json({ movies, swipesRemaining: user.Swipes_Restantes });

    } catch (err) {
        console.error("Erro no feed:", err);
        res.status(500).json({ error: 'Erro ao buscar filmes ou séries' });
    }
});

// --- ROTA DE INTERAÇÃO ---
router.post('/interaction', (req, res) => {
    const { tmdbId, liked, disliked } = req.body; 
    const userId = req.session.user.id;

    if (!tmdbId) return res.status(400).json({ success: false });

    try {
        const updateTransaction = db.transaction(() => {
            const user = db.prepare('SELECT Swipes_Restantes FROM Utilizador WHERE Utilizador_ID = ?').get(userId);
            
            if (user.Swipes_Restantes <= 0) throw new Error("LIMIT_REACHED");

            const update = db.prepare(`
                UPDATE Swipes SET liked = ?, disliked = ? 
                WHERE Utilizador_ID = ? AND tmbd_ID = ?
            `);
            const info = update.run(liked, disliked, userId, tmdbId);
            if (info.changes === 0) {
                 db.prepare(`
                    INSERT INTO Swipes (tmbd_ID, Utilizador_ID, liked, disliked, undo)
                    VALUES (?, ?, ?, ?, 0)
                `).run(tmdbId, userId, liked, disliked);
            }

            if (liked === 1) {
                const swipe = db.prepare(`SELECT SWIPE_ID FROM Swipes WHERE Utilizador_ID = ? AND tmbd_ID = ?`).get(userId, tmdbId);
                if(swipe) {
                    db.prepare(`INSERT OR IGNORE INTO Watchlist (Utilizador_ID, Swipe_ID) VALUES (?, ?)`).run(userId, swipe.SWIPE_ID);
                }
            }
            db.prepare('UPDATE Utilizador SET Swipes_Restantes = Swipes_Restantes - 1 WHERE Utilizador_ID = ?').run(userId);
        });

        updateTransaction();
        const updatedUser = db.prepare('SELECT Swipes_Restantes FROM Utilizador WHERE Utilizador_ID = ?').get(userId);
        res.json({ success: true, swipesRemaining: updatedUser.Swipes_Restantes });

    } catch (err) {
        if (err.message === "LIMIT_REACHED") return res.json({ success: false, limitReached: true });
        console.error("Erro interaction:", err);
        res.status(500).json({ success: false });
    }
});

// --- ROTA DE UNDO (Reset) ---
router.post('/undo', (req, res) => {
    const userId = req.session.user.id;
    try {
        const undoTransaction = db.transaction(() => {
            const lastSwipe = db.prepare(`
                SELECT SWIPE_ID, liked FROM Swipes 
                WHERE Utilizador_ID = ? AND (liked=1 OR disliked=1) 
                ORDER BY SWIPE_ID DESC LIMIT 1
            `).get(userId);
            
            if (!lastSwipe) return;
            if (lastSwipe.liked === 1) {
                db.prepare('DELETE FROM Watchlist WHERE Swipe_ID = ?').run(lastSwipe.SWIPE_ID);
            }
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