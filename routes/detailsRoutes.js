require('dotenv').config();
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const db = require('../db/db');
const tmdb = require('../services/tmdb');

router.get('/api/:id', authMiddleware, async (req, res) => {
    const movieId = req.params.id;
    const token = process.env.TMDB_BEARER_TOKEN;

    console.log(`--> API Detalhes pedida para ID: ${movieId}`);

    if (!token) {
        console.error("ERRO: Token TMDB não encontrado no .env");
        return res.status(500).json({ error: 'Configuração de servidor em falta' });
    }

    try {
        const url = `https://api.themoviedb.org/3/movie/${movieId}?language=pt-PT&append_to_response=credits,watch/providers,similar,release_dates`;
        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                Authorization: `Bearer ${token}`
            }
        };

        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`Erro TMDB: ${response.status}`);
        }
        
        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error("Erro no proxy de detalhes:", error.message);
        res.status(500).json({ error: 'Falha ao buscar dados externos' });
    }
});

router.get('/:id', authMiddleware, async (req, res) => {
    const movieId = req.params.id;
    const userId = req.session.user.id;

    try {
        const moviesList = await tmdb.getMoviesFromIds([movieId]);
        const movieData = moviesList && moviesList.length > 0 ? moviesList[0] : null;

        if (!movieData) {
            return res.status(404).render('error', { message: 'Filme não encontrado' });
        }

        const entry = db.prepare(`
            SELECT w.Swipe_ID FROM Watchlist w
            JOIN Swipes s ON w.Swipe_ID = s.SWIPE_ID
            WHERE w.Utilizador_ID = ? AND s.tmbd_ID = ? AND s.liked = 1
        `).get(userId, movieId);

        res.render('details', { 
            movieId: movieId,
            movie: movieData, 
            page: 'details',
            inWatchlist: !!entry
        });

    } catch (err) {
        console.error("Erro na rota de detalhes (Página):", err);
        res.status(500).send("Erro ao carregar a página.");
    }
});

module.exports = router;