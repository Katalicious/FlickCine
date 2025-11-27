document.addEventListener('DOMContentLoaded', async () => {
    // Configurações da API
    const API_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI3MmQ4M2JmMGMzMzAzNTU2MTZiN2JhMTM3Njg3Y2EwYiIsIm5iZiI6MTc2MzE0NDE2OC45NDIwMDAyLCJzdWIiOiI2OTE3NzFlOGVhY2ZmZTY1YjIzYTQ4MjEiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.bokDuW-bSLdQte8pwa7SPNpAzP4x66g75oPa8y13pb4';
    const BASE_URL = 'https://api.themoviedb.org/3';
    const IMG_BASE = 'https://image.tmdb.org/t/p/w780';
    const ICON_BASE = 'https://image.tmdb.org/t/p/original';

    if (!MOVIE_ID) return;

    window.openTab = function(evt, tabName) {
        var i, tabContent, tabLinks;
        tabContent = document.getElementsByClassName("tab-content");
        for (i = 0; i < tabContent.length; i++) {
            tabContent[i].style.display = "none";
            tabContent[i].classList.remove("active");
        }
        tabLinks = document.getElementsByClassName("tab-btn");
        for (i = 0; i < tabLinks.length; i++) {
            tabLinks[i].classList.remove("active");
        }
        document.getElementById(tabName).style.display = "block";
        setTimeout(() => document.getElementById(tabName).classList.add("active"), 10);
        evt.currentTarget.classList.add("active");
    };

    async function fetchMovieDetails() {
        try {
            const url = `${BASE_URL}/movie/${MOVIE_ID}?language=pt-PT&append_to_response=credits,watch/providers,similar,release_dates`;
            const options = { headers: { accept: 'application/json', Authorization: API_TOKEN } };

            const response = await fetch(url, options);
            if (!response.ok) throw new Error('Erro ao buscar filme');
            const data = await response.json();

            updateUI(data);

        } catch (error) {
            console.error("Erro:", error);
            document.getElementById('movie-title').innerText = "Erro ao carregar filme.";
        }
    }

    function updateUI(data) {
        const year = data.release_date ? data.release_date.split('-')[0] : 'N/A';
        const hours = data.runtime ? Math.floor(data.runtime / 60) : 0;
        const minutes = data.runtime ? data.runtime % 60 : 0;
        const age = data.adult ? "18+" : "M/12";

        document.getElementById('movie-title').innerText = data.title;
        document.getElementById('movie-year').innerText = year;
        document.getElementById('movie-age').innerText = age;
        document.getElementById('movie-duration').innerText = `${hours}h ${minutes}m`;
        document.getElementById('movie-rating').innerText = data.vote_average ? `${data.vote_average.toFixed(1)}/10` : 'N/A';
        
        const posterUrl = data.poster_path ? IMG_BASE + data.poster_path : 'https://via.placeholder.com/500x750?text=Sem+Poster';
        document.getElementById('movie-poster').src = posterUrl;
        document.getElementById('movie-description').innerText = data.overview || "Sinopse não disponível.";
        document.getElementById('movie-genres').innerText = data.genres.map(g => g.name).join(', ');
        
        const director = data.credits.crew.find(c => c.job === 'Director')?.name || 'N/A';
        const cast = data.credits.cast.slice(0, 3).map(c => c.name).join(', ');
        
        document.getElementById('movie-director').innerText = director;
        document.getElementById('movie-cast').innerText = cast;

        const formatMoney = (val) => val ? val.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'N/A';
        document.getElementById('movie-budget').innerText = formatMoney(data.budget);
        document.getElementById('movie-revenue').innerText = formatMoney(data.revenue);
        document.getElementById('movie-language').innerText = data.original_language.toUpperCase();
        document.getElementById('movie-production').innerText = data.production_companies[0]?.name || 'N/A';
        const grid = document.getElementById('similar-grid');
        grid.innerHTML = '';
        const similar = (data.similar?.results || []).filter(m => m.poster_path).slice(0, 4);
        
        similar.forEach(sim => {
            const card = document.createElement('a');
            card.href = `/details/${sim.id}`;
            card.className = 'similar-card';
            card.innerHTML = `
                <img src="${IMG_BASE + sim.poster_path}" alt="${sim.title}">
                <span>${sim.title}</span>
            `;
            grid.appendChild(card);
        });

        renderStreamingBox(data['watch/providers']?.results?.PT);
    }

    function renderStreamingBox(providers) {
        const container = document.getElementById('streaming-container');
        
        const generateIcons = (list) => {
            if (!list || list.length === 0) return '<span class="no-stream">-</span>';
            return list.map(p => {
                if(!p.logo_path) return '';
                return `<img src="${ICON_BASE + p.logo_path}" alt="${p.provider_name}" title="${p.provider_name}">`;
            }).join('');
        };

        const subs = generateIcons(providers?.flatrate);
        const rent = generateIcons(providers?.rent);
        const buy  = generateIcons(providers?.buy);

        container.innerHTML = `
            <div class="jw-section logo-section">
                <span class="jw-brand">Onde Ver</span>
            </div>
            
            <div class="jw-section">
                <span class="jw-label">Subscrição</span>
                <div class="jw-icons">${subs}</div>
            </div>

            <div class="jw-section">
                <span class="jw-label">Alugar</span>
                <div class="jw-icons">${rent}</div>
            </div>

            <div class="jw-section no-border">
                <span class="jw-label">Comprar</span>
                <div class="jw-icons">${buy}</div>
            </div>
        `;
    }
    fetchMovieDetails();
});