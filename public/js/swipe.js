document.addEventListener('DOMContentLoaded', async () => {
    const stackContainer = document.getElementById('card-stack');
    const emptyState = document.getElementById('empty-state');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    // --- Referências aos Sons ---
    const soundAccept = document.getElementById('sound-accept');
    const soundReject = document.getElementById('sound-reject');
    
    // --- Configurações Iniciais ---
    let movies = [];
    let activeIndex = 0;
    let lastAction = null; 

    // --- Função para Tocar Sons ---
    function playSound(type) {
        const audio = (type === 'accept') ? soundAccept : soundReject;
        
        if (audio) {
            audio.currentTime = 0;
            audio.volume = 0.4;   
            audio.play().catch(e => console.log("Audio play blocked:", e));
        }
    }

    // --- 1. Buscar Filmes ao Backend ---
    async function fetchMovies() {
        try {
            if (loadingSpinner) loadingSpinner.style.display = 'flex';
            if (emptyState) emptyState.style.display = 'none';

            const response = await fetch('/swipe/feed');
            if (!response.ok) throw new Error('Falha');
            
            const data = await response.json();

            if (typeof data.swipesRemaining !== 'undefined') {
                updateProgressUI(data.swipesRemaining);
            }

            if (data.limitReached) {
                showLimitMessage();
                return;
            }

            const movieList = data.movies || data; 

            if (movieList && movieList.length > 0) {
                movies = movieList; 
                activeIndex = 0;
                lastAction = null;

                if (emptyState) emptyState.style.display = 'none';
                init();
            } else {
                if (emptyState) {
                    emptyState.innerHTML = "<h2>Não há mais filmes por agora.</h2>";
                    emptyState.style.display = 'block';
                }
            }
        } catch (e) {
            console.error(e);
            if (emptyState) {
                emptyState.innerHTML = "<h2>Erro de conexão. Tenta novamente.</h2>";
                emptyState.style.display = 'block';
            }
        } finally {
            if (loadingSpinner) loadingSpinner.style.display = 'none';
        }
    }

    function showLimitMessage() {
        stackContainer.innerHTML = '';
        if (emptyState) {
            emptyState.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <h2 style="color: #e50914;">Limite Atingido!</h2>
                    <p style="color: #fff; margin-top: 10px;">Já viste os teus 30 filmes e séries de hoje. Volta amanhã!</p>
                </div>
            `;
            emptyState.style.display = 'block';
        }
    }

    function init() { 
        renderCards(); 
        updateSidebar(activeIndex); 
    }

    // --- 2. Renderizar Cartões ---
    function renderCards() {
        stackContainer.innerHTML = '';
        if (activeIndex >= movies.length) {
            const btnContainer = document.createElement('div');
            btnContainer.className = 'end-stack-container';
            
            btnContainer.innerHTML = `
                <div class="end-stack-content">
                    <i class="fas fa-film" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                    <h2>Viste as 10 Sugestões que tínhamos para ti!</h2>
                    <p>Queres continuar a explorar?</p>
                    
                    <button id="btn-load-more" class="btn-load-more">
                        <i class="fas fa-sync-alt"></i> Carregar mais 10
                    </button>
                </div>
            `;
            stackContainer.appendChild(btnContainer);

            document.getElementById('btn-load-more').addEventListener('click', () => {
                fetchMovies();
            });
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

    // --- 3. Sidebar ---
    function updateSidebar(index) {
        const subs = document.getElementById('stream-subs');
        const rent = document.getElementById('stream-rent');
        const buy = document.getElementById('stream-buy');
        
        if(subs) subs.innerHTML = ''; if(rent) rent.innerHTML = ''; if(buy) buy.innerHTML = '';
        if (index >= movies.length) return;
        
        const movie = movies[index];
        const renderList = (list, container) => {
            if (!list?.length || !container) return;
            container.innerHTML = list.map(p => `
                <div class="provider-wrapper"><img src="${p.icon}" class="provider-icon" title="${p.name}"></div>
            `).join('');
        };
        if (movie.providers) {
            renderList(movie.providers.subs, subs);
            renderList(movie.providers.rent, rent);
            renderList(movie.providers.buy, buy);
        }
    }

    // --- 4. Toasts ---
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

    // --- 5. Drag & Drop ---
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

    // --- 6. Trigger Swipe ---
    window.triggerSwipe = async (dir) => {
        const card = document.querySelector('.current-card');
        if(!card) return;
        if (dir === 'right') {
            playSound('accept');
        } else {
            playSound('reject');
        }

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
        })
        .then(res => res.json())
        .then(data => {
            if (data.limitReached) {
                alert("Atingiste o teu limite diário de 30 swipes! Volta amanhã.");
                window.location.reload();
                return;
            }
            if (typeof data.swipesRemaining !== 'undefined') {
                updateProgressUI(data.swipesRemaining);
            }
        })
        .catch(err => console.error("Erro DB:", err));

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

    // --- 7. Undo ---
    window.handleUndo = async () => {
        if (!lastAction) { showToast("Nada para desfazer!", "info"); return; }
        playSound('reject');

        try {
            const res = await fetch('/swipe/undo', { method: 'POST' });
            const data = await res.json();

            if (typeof data.swipesRemaining !== 'undefined') {
                updateProgressUI(data.swipesRemaining);
            }
            
            if (!data.success) throw new Error("Erro no servidor");

            activeIndex = lastAction.index;
            lastAction = null;
            
            showToast("Ação desfeita!", "info");
            
            renderCards();
            updateSidebar(activeIndex);

        } catch (err) {
            console.error(err);
            showToast("Erro ao desfazer ação.", "error");
        }
    };
    function updateProgressUI(current) {
        const max = 30;
        const percent = Math.max(0, Math.min(100, (current / max) * 100));
        
        const fill = document.getElementById('progress-fill');
        const count = document.getElementById('swipes-count');
        
        if(fill) {
            fill.style.height = `${percent}%`;
            if(current > 15) fill.style.background = 'linear-gradient(to top, #2ecc71, #27ae60)'; 
            else if(current > 5) fill.style.background = 'linear-gradient(to top, #f1c40f, #f39c12)'; 
            else fill.style.background = 'linear-gradient(to top, #e50914, #c0392b)';
        }
        if(count) count.innerText = current;
    }

    function startTimer() {
        const timerEl = document.getElementById('reset-timer');
        if(!timerEl) return;

        const updateTimer = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            
            const diff = tomorrow - now;
            
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            timerEl.innerText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        };

        updateTimer();
        setInterval(updateTimer, 1000);
    }
    
    startTimer();
    fetchMovies();
});