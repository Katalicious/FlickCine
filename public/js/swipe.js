document.addEventListener('DOMContentLoaded', async () => {
    const stackContainer = document.getElementById('card-stack');
    const emptyState = document.getElementById('empty-state');

    let movies = [];
    let activeIndex = 0;
    let lastAction = null; 

    async function fetchMovies() {
        try {
            const response = await fetch('/swipe/feed');
            
            if (!response.ok) throw new Error('Falha ao comunicar com o servidor');
            
            const data = await response.json();

            if (data && data.length > 0) {
                movies = data; 
                activeIndex = 0;
                
                if (emptyState) emptyState.style.display = 'none';
                init();
            } else {
                console.warn("Servidor não retornou filmes.");
            }
        } catch (e) {
            console.error("Erro fetchMovies:", e);
            if (emptyState) {
                emptyState.innerHTML = "<h2>Erro ao carregar filmes. Tenta recarregar a página.</h2>";
                emptyState.style.display = 'block';
            }
        }
    }

    function init() { 
        renderCards(); 
        updateSidebar(activeIndex); 
    }

    function renderCards() {
        stackContainer.innerHTML = '';
        
        if (activeIndex >= movies.length) {
            fetchMovies();
            return;
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
            const posterSrc = movie.poster ? movie.poster : 'https://via.placeholder.com/500x750?text=Sem+Imagem';
            mediaContent = `<img src="${posterSrc}" alt="${movie.title}" draggable="false">`;
        }

        el.innerHTML = `
            <div class="card-header">
                <span class="movie-rating">Rating ${movie.rating || 'N/A'}</span>
                <span class="movie-title">${movie.title}</span>
                <div class="movie-meta">
                    <span>${movie.year}</span> 
                </div>
            </div>

            <div class="media-wrapper">
                ${mediaContent}
                <div class="drag-layer"></div>
                
                <a href="/details/${movie.id}" class="btn-details-inside" onmousedown="event.stopPropagation()">
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

    function updateSidebar(index) {
        const subs = document.getElementById('stream-subs');
        const rent = document.getElementById('stream-rent');
        const buy = document.getElementById('stream-buy');
        
        if(subs) subs.innerHTML = ''; 
        if(rent) rent.innerHTML = ''; 
        if(buy) buy.innerHTML = '';

        if (index >= movies.length) return;
        const movie = movies[index];

        const renderList = (list, container) => {
            if (!list?.length || !container) return;
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

    function showToast(msg, type) {
        const c = document.getElementById('toast-container');
        if (!c) return;

        const t = document.createElement('div');
        t.className = `toast ${type}`;
        const icon = type === 'success' ? 'check' : type === 'error' ? 'times' : 'undo';
        t.innerHTML = `<i class="fas fa-${icon}"></i> ${msg}`;
        c.appendChild(t);
        
        setTimeout(() => {
            t.style.transition = "opacity 0.5s ease";
            t.style.opacity = '0';
            setTimeout(() => t.remove(), 500);
        }, 2000);
    }

    function initDragEvents(card) {
        let isDragging = false, startX = 0, currentX = 0;

        const start = (e) => {
            if(e.target.closest('button') || e.target.closest('a') || e.target.tagName === 'IFRAME') return;
            
            isDragging = true;
            startX = (e.type === 'touchstart') ? e.touches[0].clientX : e.clientX;
            card.classList.add('is-dragging');
            card.style.transition = 'none'; 
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

            if (Math.abs(currentX) > 150) {
                triggerSwipe(currentX > 0 ? 'right' : 'left');
            } else {
                card.style.transition = 'transform 0.3s ease-out';
                card.style.transform = '';
            }
            currentX = 0;
        };

        const dragLayer = card.querySelector('.drag-layer');
        if(dragLayer) {
            dragLayer.addEventListener('mousedown', start);
            dragLayer.addEventListener('touchstart', start, {passive: false});
        } else {
            card.addEventListener('mousedown', start);
            card.addEventListener('touchstart', start, {passive: false});
        }
    }

    window.triggerSwipe = async (dir) => {
        const card = document.querySelector('.current-card');
        if(!card) return;

        lastAction = { index: activeIndex, dir: dir };

        const currentMovie = movies[activeIndex];
        const isLiked = dir === 'right' ? 1 : 0;
        const isDisliked = dir === 'left' ? 1 : 0;

        fetch('/swipe/interaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tmdbId: currentMovie.id,
                title: currentMovie.title,
                poster: currentMovie.poster,
                liked: isLiked,
                disliked: isDisliked,
                overview: currentMovie.description,
                year: currentMovie.year
            })
        }).catch(err => console.error("Erro DB:", err));

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

window.handleUndo = async () => {
        if (!lastAction) { 
            showToast("Nada para desfazer!", "info"); 
            return; 
        }
        
        try {
            const res = await fetch('/swipe/undo', { method: 'POST' });
            const data = await res.json();
            
            if (!data.success) throw new Error("Erro no servidor");

            activeIndex = lastAction.index;
            lastAction = null;
            
            showToast("Ação desfeita e removida!", "info");
            
            renderCards();
            updateSidebar(activeIndex);

        } catch (err) {
            console.error(err);
            showToast("Erro ao desfazer ação.", "error");
        }
    };

    fetchMovies();
});