require('dotenv').config();

const BASE_URL = 'https://api.themoviedb.org/3';
const TOKEN = process.env.TMDB_BEARER_TOKEN;

const options = {
    method: 'GET',
    headers: {
        accept: 'application/json',
        Authorization: `Bearer ${TOKEN}`
    }
};

async function getRandomMovies() {
    try {
        const randomPage = Math.floor(Math.random() * 50) + 1;
        const url = `${BASE_URL}/discover/movie?include_adult=false&include_video=false&language=pt-PT&page=${randomPage}&sort_by=popularity.desc`;

        const response = await fetch(url, options);
        if (!response.ok) throw new Error('Erro API TMDB');

        const data = await response.json();
        
        let shuffled = data.results.sort(() => 0.5 - Math.random());
        let selectedMovies = shuffled.slice(0, 10);

        const formattedMovies = selectedMovies.map(m => ({
            id: m.id,
            title: m.title,
            original_title: m.original_title,
            year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
            rating: m.vote_average ? m.vote_average.toFixed(1) : 'N/A',
            description: m.overview || "Sem descrição disponível.",
            poster: m.poster_path ? `https://image.tmdb.org/t/p/w780${m.poster_path}` : null,
            backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : null
        })).filter(m => m.poster);

        return formattedMovies;

    } catch (error) {
        console.error(error);
        return [];
    }
}

module.exports = { getRandomMovies };