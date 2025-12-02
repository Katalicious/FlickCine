document.addEventListener('DOMContentLoaded', async () => {
  
    const IMG_BASE = 'https://image.tmdb.org/t/p/w780';
    const ICON_BASE = 'https://image.tmdb.org/t/p/original';

    if (typeof MOVIE_ID !== 'undefined' && MOVIE_ID) {
        fetchMovieDetails();
    }

    const btnRemove = document.getElementById('btn-remove-details');
    const confirmModal = document.getElementById('confirm-modal');
    const btnConfirmModal = document.getElementById('btn-modal-confirm');
    const btnCancelModal = document.getElementById('btn-modal-cancel');
    let idToRemove = null;

    // 1. Clicar no Lixo -> Abrir Modal
    if (btnRemove) {
        btnRemove.addEventListener('click', (e) => {
            e.stopPropagation();
            idToRemove = btnRemove.getAttribute('data-movie-id');
            if(confirmModal) confirmModal.style.display = 'flex';
        });
    }

    if (btnCancelModal) {
        btnCancelModal.addEventListener('click', () => {
            if(confirmModal) confirmModal.style.display = 'none';
        });
    }

    if (btnConfirmModal) {
        btnConfirmModal.addEventListener('click', async () => {
            if (!idToRemove) return;
            if(confirmModal) confirmModal.style.display = 'none';

            try {
                const response = await fetch('/watchlist/remove', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ movieId: idToRemove })
                });

                const result = await response.json();

                if (result.success) {
                    showDetailsToast('Removido com sucesso!', 'success');
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    alert("Erro ao remover.");
                }
            } catch (error) {
                console.error("Erro:", error);
            }
        });
    }

    async function removeMovie(id) {
        try {
            const response = await fetch('/watchlist/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movieId: id })
            });
            const result = await response.json();
            if (result.success) {
                showDetailsToast('Removido com sucesso!', 'success');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                alert("Erro ao remover.");
            }
        } catch (error) {
            console.error("Erro:", error);
        }
    }

    function showDetailsToast(msg, type) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.position = 'fixed';
            container.style.bottom = '30px';
            container.style.left = '50%';
            container.style.transform = 'translateX(-50%)';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.style.backgroundColor = type === 'success' ? '#2ecc71' : '#e74c3c';
        toast.style.color = 'white';
        toast.style.padding = '12px 20px';
        toast.style.borderRadius = '50px';
        toast.style.fontWeight = 'bold';
        toast.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
        toast.innerText = msg;
        
        container.appendChild(toast);
    }

    // --- 2. Lógica das Tabs ---
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
            const url = `/details/api/${MOVIE_ID}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Erro ao buscar dados');
            const data = await response.json();
            updateUI(data);
        } catch (error) {
            console.error("Erro:", error);
        }
    }

    function updateUI(data) {
        const isTv = data.media_type === 'tv' || !!data.name;

        const title = data.title || data.name;
        setText('movie-title', title);

        const dateStr = data.release_date || data.first_air_date || '';
        const year = dateStr.split('-')[0] || 'N/A';
        setText('movie-year', year);

        let runtime = data.runtime;
        if (!runtime && data.episode_run_time && data.episode_run_time.length > 0) {
            runtime = data.episode_run_time[0];
        }

        let durationText = 'N/A';
        if (runtime) {
            const h = Math.floor(runtime / 60);
            const m = runtime % 60;
            durationText = h > 0 ? `${h}h ${m}m` : `${m}m`;
            if (isTv) durationText += " (ep)";
        }
        setText('movie-duration', durationText);

        const vote = data.vote_average ? data.vote_average.toFixed(1) : 'N/A';
        setText('movie-rating', `${vote}/10`);
        setText('movie-description', data.overview || "Sinopse não disponível.");
        
        const age = data.adult ? "18+" : "M/12";
        setText('movie-age', age);

        if(data.genres) {
            setText('movie-genres', data.genres.map(g => g.name).join(', '));
        }

        if (data.credits) {
            const cast = data.credits.cast ? data.credits.cast.slice(0, 3).map(c => c.name).join(', ') : 'N/A';
            setText('movie-cast', cast);
            let maker = 'N/A';
            if (isTv && data.created_by && data.created_by.length > 0) {
                maker = data.created_by.map(c => c.name).join(', ');
            } else if (data.credits.crew) {
                const dir = data.credits.crew.find(c => c.job === 'Director');
                if (dir) maker = dir.name;
            }
            setText('movie-director', maker);
        }

        const formatMoney = (val) => val ? val.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'N/A';
        setText('movie-budget', formatMoney(data.budget));
        setText('movie-revenue', formatMoney(data.revenue));
        
        if (data.original_language) setText('movie-language', data.original_language.toUpperCase());
        if (data.production_companies && data.production_companies[0]) {
            setText('movie-production', data.production_companies[0].name);
        }

        const grid = document.getElementById('similar-grid');
        if (grid && data.similar && data.similar.results) {
            grid.innerHTML = '';
            const similar = data.similar.results.filter(m => m.poster_path).slice(0, 4);
            
            similar.forEach(sim => {
                let simId = sim.id;
                if (isTv) simId += 10000000;

                const simTitle = sim.title || sim.name;
                const card = document.createElement('a');
                card.href = `/details/${simId}`;
                card.className = 'similar-card';
                card.innerHTML = `
                    <img src="${IMG_BASE + sim.poster_path}" alt="${simTitle}">
                    <span>${simTitle}</span>
                `;
                grid.appendChild(card);
            });
        }

        renderStreamingBox(data['watch/providers']?.results?.PT);
    }
        function setText(id, text) {
        const el = document.getElementById(id);
        if(el) el.innerText = text;
    }
    
    function renderStreamingBox(providers) {
        const container = document.getElementById('streaming-container');
        if(!container) return;
        
        const generateIcons = (list) => {
            if (!list || list.length === 0) return '<span class="no-stream">-</span>';
            return list.map(p => `<img src="${ICON_BASE + p.logo_path}" alt="${p.provider_name}" title="${p.provider_name}">`).join('');
        };

        const subs = generateIcons(providers?.flatrate);
        const rent = generateIcons(providers?.rent);
        const buy  = generateIcons(providers?.buy);

        container.innerHTML = `
            <div class="jw-section logo-section"><span class="jw-brand">Onde Ver</span></div>
            <div class="jw-section"><span class="jw-label">Subscrição</span><div class="jw-icons">${subs}</div></div>
            <div class="jw-section"><span class="jw-label">Alugar</span><div class="jw-icons">${rent}</div></div>
            <div class="jw-section no-border"><span class="jw-label">Comprar</span><div class="jw-icons">${buy}</div></div>
        `;
    }
});