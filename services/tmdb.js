require('dotenv').config();

const BASE_URL = 'https://api.themoviedb.org/3';
const TOKEN = process.env.TMDB_BEARER_TOKEN;
const TV_OFFSET = 10000000; // Valor para distinguir Séries de Filmes na BD

const options = {
    method: 'GET',
    headers: {
        accept: 'application/json',
        Authorization: `Bearer ${TOKEN}`
    }
};

// --- Função Auxiliar: Buscar detalhes (Filmes e Séries) ---
async function fetchDetailsForList(movieList) {
    const detailedContent = await Promise.all(movieList.map(async (basicItem) => {
        try {
            // 1. Detetar se é Filme ou Série
            let id = typeof basicItem === 'object' ? basicItem.id : basicItem;
            let type = 'movie';
            let realId = id;

            if (id > TV_OFFSET) {
                type = 'tv';
                realId = id - TV_OFFSET;
            }

            // 2. Pedir detalhes à API
            const detailUrl = `${BASE_URL}/${type}/${realId}?language=pt-PT&append_to_response=watch/providers,videos,credits`;
            const detailRes = await fetch(detailUrl, options);
            
            if(!detailRes.ok) return null;

            // AQUI: Usamos 'details' por extenso como pediste
            const details = await detailRes.json();
            
            // --- 3. Normalizar Dados ---
            
            // Título
            const title = details.title || details.name;
            const originalTitle = details.original_title || details.original_name;
            
            // Data
            const releaseDate = details.release_date || details.first_air_date || '';
            const year = releaseDate ? releaseDate.split('-')[0] : 'N/A';

            // Duração
            const runtime = details.runtime || (details.episode_run_time && details.episode_run_time.length > 0 ? details.episode_run_time[0] : 0);

            // Trailer
            const videos = details.videos?.results || [];
            const trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer') || videos[0];
            const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : '';

            // Providers
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

            // Listas de Texto
            const genres = details.genres ? details.genres.map(g => g.name).join(', ') : '';
            const cast = details.credits?.cast ? details.credits.cast.slice(0, 5).map(c => c.name).join(', ') : '';
            
            let makers = '';
            if (details.created_by && details.created_by.length > 0) {
                makers = details.created_by.map(c => c.name).join(', ');
            } else if (details.production_companies) {
                makers = details.production_companies.slice(0, 3).map(c => c.name).join(', ');
            }

            // --- Retornar Objeto ---
            return {
                id: id, 
                title: title,
                original_title: originalTitle,
                year: year,
                full_date: releaseDate,
                rating: details.vote_average ? details.vote_average.toFixed(1) : 'N/A',
                description: details.overview || "Sem descrição.",
                poster: details.poster_path ? `https://image.tmdb.org/t/p/w780${details.poster_path}` : null,
                backdrop: details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : null,
                
                genres: genres,
                runtime: runtime,
                cast: cast,
                producers: makers,
                trailerId: trailer ? trailer.key : null,
                trailerLink: trailerUrl,
                
                providersJson: JSON.stringify(providersObject),
                providers: providersObject
            };

        } catch (innerErr) {
            console.error(`Erro detalhes (ID ${basicItem}):`, innerErr.message);
            return null;
        }
    }));

    return detailedContent.filter(m => m !== null && m.poster);
}

async function getRandomMovies(excludedIds = []) {
    try {
        let attempts = 0;
        let selected = [];
        
        while (selected.length < 10 && attempts < 4) {
            attempts++;
            const page = Math.floor(Math.random() * 20) + 1;
            
            const isTv = Math.random() > 0.5;
            const type = isTv ? 'tv' : 'movie';
            
            const url = `${BASE_URL}/discover/${type}?include_adult=false&language=pt-PT&page=${page}&sort_by=popularity.desc&watch_region=PT&with_watch_monetization_types=flatrate|free|ads|rent|buy`;

            const res = await fetch(url, options);
            if (!res.ok) continue;

            const data = await res.json();
            
            const fresh = data.results
                .map(item => {
                    if (isTv) item.id = item.id + TV_OFFSET;
                    return item;
                })
                .filter(item => !excludedIds.includes(item.id));

            selected = [...selected, ...fresh];
        }

        let shuffled = selected.sort(() => 0.5 - Math.random()).slice(0, 10);
        
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