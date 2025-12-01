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
            
            if (!response.ok) throw new Error('Erro ao buscar filme');
            const data = await response.json();

            updateUI(data);

        } catch (error) {
            console.error("Erro:", error);
        }
    }

    function updateUI(data) {
        const year = data.release_date ? data.release_date.split('-')[0] : 'N/A';
        const hours = data.runtime ? Math.floor(data.runtime / 60) : 0;
        const minutes = data.runtime ? data.runtime % 60 : 0;
        const age = data.adult ? "18+" : "M/12";

        if(document.getElementById('movie-year')) document.getElementById('movie-year').innerText = year;
        if(document.getElementById('movie-age')) document.getElementById('movie-age').innerText = age;
        if(document.getElementById('movie-duration')) document.getElementById('movie-duration').innerText = `${hours}h ${minutes}m`;
        
        const vote = data.vote_average ? data.vote_average.toFixed(1) : 'N/A';
        if(document.getElementById('movie-rating')) document.getElementById('movie-rating').innerText = `${vote}/10`;
        
        if(document.getElementById('movie-genres')) document.getElementById('movie-genres').innerText = data.genres.map(g => g.name).join(', ');
        
        const director = data.credits.crew.find(c => c.job === 'Director')?.name || 'N/A';
        const cast = data.credits.cast.slice(0, 3).map(c => c.name).join(', ');
        
        if(document.getElementById('movie-director')) document.getElementById('movie-director').innerText = director;
        if(document.getElementById('movie-cast')) document.getElementById('movie-cast').innerText = cast;

        const formatMoney = (val) => val ? val.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'N/A';
        if(document.getElementById('movie-budget')) document.getElementById('movie-budget').innerText = formatMoney(data.budget);
        if(document.getElementById('movie-revenue')) document.getElementById('movie-revenue').innerText = formatMoney(data.revenue);
        if(document.getElementById('movie-language')) document.getElementById('movie-language').innerText = data.original_language.toUpperCase();
        if(document.getElementById('movie-production')) document.getElementById('movie-production').innerText = data.production_companies[0]?.name || 'N/A';

        const grid = document.getElementById('similar-grid');
        if (grid) {
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
        }

        renderStreamingBox(data['watch/providers']?.results?.PT);
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