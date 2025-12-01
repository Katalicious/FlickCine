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

async function fetchDetailsForList(movieList) {
    const detailedMovies = await Promise.all(movieList.map(async (basicMovie) => {
        try {
            const movieId = typeof basicMovie === 'object' ? basicMovie.id : basicMovie;

            const detailUrl = `${BASE_URL}/movie/${movieId}?language=pt-PT&append_to_response=watch/providers,videos,credits`;
            const detailRes = await fetch(detailUrl, options);
            
            if(!detailRes.ok) return null;

            const details = await detailRes.json();
            const videos = details.videos?.results || [];
            const trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer') || videos[0];
            const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : '';
            const ptProviders = details['watch/providers']?.results?.PT || {};
            const mapProvider = (list) => (list || []).map(p => ({
                icon: p.logo_path ? `https://image.tmdb.org/t/p/original${p.logo_path}` : null,
                name: p.provider_name
            })).filter(p => p.icon);
    
            const providersObject = {
                subs: mapProvider(ptProviders.flatrate),
                rent: mapProvider(ptProviders.rent),
                buy: mapProvider(ptProviders.buy)
            };

            const genres = details.genres ? details.genres.map(g => g.name).join(', ') : '';
            const cast = details.credits?.cast ? details.credits.cast.slice(0, 5).map(c => c.name).join(', ') : '';
            const producers = details.production_companies ? details.production_companies.slice(0, 3).map(c => c.name).join(', ') : '';

            return {
                id: details.id,
                title: details.title,
                original_title: details.original_title,
                year: details.release_date ? details.release_date.split('-')[0] : 'N/A',
                full_date: details.release_date || '',
                rating: details.vote_average ? details.vote_average.toFixed(1) : 'N/A',
                description: details.overview || "Sem descrição disponível.",
                poster: details.poster_path ? `https://image.tmdb.org/t/p/w780${details.poster_path}` : null,
                backdrop: details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : null,
                trailerId: trailer ? trailer.key : null,
                genres: genres,
                runtime: details.runtime || 0,
                cast: cast,
                producers: producers,
                trailerId: trailer ? trailer.key : null,
                trailerLink: trailerUrl,
                providersJson: JSON.stringify(providersObject),
                providers: providersObject
            };
        } catch (innerErr) {
            console.error(`Erro detalhes filme ${basicMovie}:`, innerErr.message);
            return null;
        }
    }));

    return detailedMovies.filter(m => m !== null && m.poster);
}

async function getRandomMovies(excludedIds = []) {
    try {
        let attempts = 0;
        let selectedBasicMovies = [];
        while (selectedBasicMovies.length < 10 && attempts < 3) {
            attempts++;
            const randomPage = Math.floor(Math.random() * 20) + 1;
            const discoverUrl = `${BASE_URL}/discover/movie?include_adult=false&include_video=false&language=pt-PT&page=${randomPage}&sort_by=popularity.desc&watch_region=PT&with_watch_monetization_types=flatrate|free|ads|rent|buy`;

            const response = await fetch(discoverUrl, options);
            if (!response.ok) continue;

            const data = await response.json();

            const freshMovies = data.results.filter(m => !excludedIds.includes(m.id));

            selectedBasicMovies = [...selectedBasicMovies, ...freshMovies];
        }

        let shuffled = selectedBasicMovies.sort(() => 0.5 - Math.random()).slice(0, 10);

        return await fetchDetailsForList(shuffled);

    } catch (error) {
        console.error("Erro TMDB Random:", error.message);
        return [];
    }
}

async function getMoviesFromIds(ids) {
    try {
        return await fetchDetailsForList(ids);
    } catch (error) {
        console.error("Erro TMDB IDs:", error.message);
        return [];
    }
}

module.exports = { getRandomMovies, getMoviesFromIds };