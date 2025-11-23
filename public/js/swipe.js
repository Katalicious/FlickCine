document.addEventListener('DOMContentLoaded', async () => {
    const stackContainer = document.getElementById('card-stack');
    
    const API_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI3MmQ4M2JmMGMzMzAzNTU2MTZiN2JhMTM3Njg3Y2EwYiIsIm5iZiI6MTc2MzE0NDE2OC45NDIwMDAyLCJzdWIiOiI2OTE3NzFlOGVhY2ZmZTY1YjIzYTQ4MjEiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.bokDuW-bSLdQte8pwa7SPNpAzP4x66g75oPa8y13pb4'; 
    const BASE_URL = 'https://api.themoviedb.org/3';
    const IMG_URL = 'https://image.tmdb.org/t/p/w780';
    const LOGO_URL = 'https://image.tmdb.org/t/p/original';
    
    // Lista de filmes para carregar
    const movieIdsToFetch = [693134, 157336, 550, 93405, 27205];
    let movies = [];
    let activeIndex = 0;
    let lastAction = null;

    // Dados de Fallback (Offline)
    const fallbackMovies = [{
        id: 0, title: "Modo Offline", original_title: "Offline",
        year: "2025", rating: "0.0", duration: "0h 0m", age: "N/A",
        description: "Verifica o Token da API no ficheiro JS.",
        poster: "https://via.placeholder.com/800x450", trailerId: null,
        providers: { subs: [], rent: [], buy: [] }
    }];

    // --- Função Principal: Buscar Filmes ---
    async function fetchMovies() {
        if (API_TOKEN.length < 20 || API_TOKEN.includes('72d83bf0c330355616b7ba137687ca0b')) {
            movies = fallbackMovies; init(); return;
        }

        try {
            const options = { method: 'GET', headers: { accept: 'application/json', Authorization: API_TOKEN } };
            
            const promises = movieIdsToFetch.map(async id => {
                const url = `${BASE_URL}/movie/${id}?language=pt-PT&append_to_response=videos,watch/providers,release_dates`;
                const res = await fetch(url, options);
                if (!res.ok) return null;
                return res.json();
            });

            const results = (await Promise.all(promises)).filter(d => d !== null);
            
            movies = results.map(data => {
                // Processamento de Video
                const videos = data.videos?.results || [];
                const trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer') || videos[0];
                
                // Processamento de Providers
                const ptProviders = data['watch/providers']?.results?.PT || {};
                const mapProvider = (list) => (list || []).map(p => ({
                    icon: p.logo_path ? LOGO_URL + p.logo_path : null,
                    name: p.provider_name,
                    price: '' // Placeholder para preço se disponível
                })).filter(p => p.icon);

                // Formatação de Metadados
                const year = data.release_date ? data.release_date.split('-')[0] : '';
                const hours = data.runtime ? Math.floor(data.runtime / 60) : 0;
                const minutes = data.runtime ? data.runtime % 60 : 0;
                const age = data.adult ? "18+" : "M/12"; 

                return {
                    id: data.id,
                    title: data.title,
                    original_title: data.original_title,
                    year: year,
                    rating: data.vote_average ? data.vote_average.toFixed(1) : 'N/A',
                    age: age,
                    duration: `${hours}h ${minutes}m`,
                    description: data.overview || "Sem descrição.",
                    poster: data.backdrop_path ? IMG_URL + data.backdrop_path : '',
                    trailerId: trailer ? trailer.key : null,
                    providers: {
                        subs: mapProvider(ptProviders.flatrate),
                        rent: mapProvider(ptProviders.rent),
                        buy: mapProvider(ptProviders.buy)
                    }
                };
            });
            
            init();
        } catch (e) {
            console.error(e);
            movies = fallbackMovies; init();
        }
    }

    // --- Inicialização da UI ---
    function init() { renderCards(); updateSidebar(activeIndex); }

    function renderCards() {
        stackContainer.innerHTML = '';
        if (activeIndex >= movies.length) {
            document.getElementById('empty-state').style.display = 'block';
            updateSidebar(activeIndex); return;
        }
        for (let i = Math.min(movies.length - 1, activeIndex + 1); i >= activeIndex; i--) {
            createCardElement(movies[i], i === activeIndex);
        }
    }

    function createCardElement(movie, isActive) {
        const el = document.createElement('div');
        el.classList.add('movie-card');
        if (isActive) {
            el.classList.add('current-card');
            el.style.zIndex = 100;
            initDragEvents(el);
        } else {
            el.style.zIndex = 50;
            el.style.transform = 'scale(0.95) translateY(10px)';
            el.style.opacity = '0.5';
        }

        let mediaContent;
        if (isActive && movie.trailerId) {
            mediaContent = `<iframe src="https://www.youtube.com/embed/${movie.trailerId}?autoplay=1&mute=1&controls=1&modestbranding=1&rel=0&loop=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        } else {
            mediaContent = `<img src="${movie.poster}" alt="${movie.title}">`;
        }

        el.innerHTML = `
            <div class="card-header">
                <span class="movie-rating">Rating ${movie.rating}/10</span>
                <span class="movie-title">${movie.title}</span>
                <div class="movie-meta">
                    <span>${movie.year}</span> • 
                    <span>${movie.age}</span> • 
                    <span>${movie.duration}</span>
                </div>
            </div>

            <div class="media-wrapper">
                ${mediaContent}
                <div class="drag-layer"></div>
                
                <a href="/details/${movie.id}" class="btn-details-inside">
                    <i class="fas fa-search"></i> Ver mais
                </a>
            </div>

            <div class="movie-description">
                ${movie.description}
            </div>

            <div class="action-buttons">
                <button class="action-btn btn-reject" onmousedown="event.stopPropagation()" onclick="triggerSwipe('left')">
                    <i class="fas fa-times"></i>
                    <span class="btn-label">Sem interesse</span>
                </button>
                <button class="action-btn btn-undo" onmousedown="event.stopPropagation()" onclick="handleUndo()">
                    <i class="fas fa-undo"></i>
                    <span class="btn-label">Desfazer</span>
                </button>
                <button class="action-btn btn-like" onmousedown="event.stopPropagation()" onclick="triggerSwipe('right')">
                    <i class="fas fa-check"></i>
                    <span class="btn-label">Adicionar à watchlist</span>
                </button>
            </div>
        `;
        stackContainer.appendChild(el);
    }

    // --- Atualização da Sidebar ---
    function updateSidebar(index) {
        const subs = document.getElementById('stream-subs');
        const rent = document.getElementById('stream-rent');
        const buy = document.getElementById('stream-buy');
        if(subs) subs.innerHTML = ''; if(rent) rent.innerHTML = ''; if(buy) buy.innerHTML = '';

        if (index >= movies.length) return;
        const movie = movies[index];

        const renderList = (list, container) => {
            if (!list?.length) return;
            container.innerHTML = list.map(p => `
                <div class="provider-wrapper">
                    <img src="${p.icon}" class="provider-icon" title="${p.name}">
                </div>
            `).join('');
        };

        if (movie.providers) {
            renderList(movie.providers.subs, subs);
            renderList(movie.providers.rent, rent);
            renderList(movie.providers.buy, buy);
        }
    }

    // --- Sistema de Notificações ---
    function showToast(msg, type) {
        const c = document.getElementById('toast-container');
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        const icon = type === 'success' ? 'check' : type === 'error' ? 'times' : 'undo';
        t.innerHTML = `<i class="fas fa-${icon}"></i> ${msg}`;
        c.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            setTimeout(() => t.remove(), 300);
        }, 2000);
    }

    // --- Lógica de Drag & Drop ---
    function initDragEvents(card) {
        let isDragging = false, startX = 0, currentX = 0;

        const start = (e) => {
            if(e.target.closest('button') || e.target.closest('a') || e.target.tagName === 'IFRAME') return;
            isDragging = true;
            startX = (e.type === 'touchstart') ? e.touches[0].clientX : e.clientX;
            card.classList.add('is-dragging');
            document.addEventListener('mousemove', move);
            document.addEventListener('touchmove', move, {passive: false});
            document.addEventListener('mouseup', end);
            document.addEventListener('touchend', end);
        };

        const move = (e) => {
            if(!isDragging) return;
            if(e.type === 'touchmove') e.preventDefault();
            const x = (e.type === 'touchmove') ? e.touches[0].clientX : e.clientX;
            currentX = x - startX;
            card.style.transform = `translateX(${currentX}px) rotate(${currentX * 0.05}deg)`;
        };

        const end = () => {
            if(!isDragging) return;
            isDragging = false;
            card.classList.remove('is-dragging');
            document.removeEventListener('mousemove', move);
            document.removeEventListener('touchmove', move);
            document.removeEventListener('mouseup', end);
            document.removeEventListener('touchend', end);

            if (Math.abs(currentX) > 150) triggerSwipe(currentX > 0 ? 'right' : 'left');
            else card.style.transform = '';
            currentX = 0;
        };

        // Evento aplicado ao drag-layer para não bloquear controlos
        const dragLayer = card.querySelector('.drag-layer');
        if(dragLayer) {
            dragLayer.addEventListener('mousedown', start);
            dragLayer.addEventListener('touchstart', start, {passive: false});
        } else {
            card.addEventListener('mousedown', start);
            card.addEventListener('touchstart', start, {passive: false});
        }
    }

    // --- Lógica de Ação (Swipe/Undo) ---
    window.triggerSwipe = (dir) => {
        const card = document.querySelector('.current-card');
        if(!card) return;
        lastAction = { index: activeIndex, dir: dir };
        const x = dir === 'right' ? 1000 : -1000;
        const r = dir === 'right' ? 20 : -20;
        card.style.transition = 'transform 0.4s ease-out';
        card.style.transform = `translateX(${x}px) rotate(${r}deg)`;
        const msg = dir === 'right' ? 'Adicionado à watchlist' : 'Sem interesse';
        const type = dir === 'right' ? 'success' : 'error';
        showToast(msg, type);
        setTimeout(() => {
            card.remove();
            activeIndex++;
            renderCards();
            updateSidebar(activeIndex);
        }, 300);
    };

    window.handleUndo = () => {
        if (!lastAction) { showToast("Nada para desfazer!", "info"); return; }
        activeIndex = lastAction.index;
        lastAction = null;
        showToast("Ação desfeita!", "info");
        renderCards();
        updateSidebar(activeIndex);
    };

    fetchMovies();
});