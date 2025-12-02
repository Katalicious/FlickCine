document.addEventListener("DOMContentLoaded", function () {
  const btnAvatar = document.getElementById("alterar-avatar");
  const btnPassword = document.getElementById("alterar-password");

  const popupAvatar = document.getElementById("popup-avatar");
  const popupPassword = document.getElementById("popup-password");

  const closeAvatar = document.getElementById("close-avatar");
  const closePassword = document.getElementById("close-password");

  function openPopup(popupElement) {
    if (popupElement) popupElement.style.display = "flex";
  }

  function closePopup(popupElement) {
    if (popupElement) popupElement.style.display = "none";
  }

  if (btnAvatar) {
    btnAvatar.addEventListener("click", (e) => {
      e.preventDefault();
      openPopup(popupAvatar);
    });
  }

  if (btnPassword) {
    btnPassword.addEventListener("click", (e) => {
      e.preventDefault();
      openPopup(popupPassword);
    });
  }

  if (closeAvatar)
    closeAvatar.addEventListener("click", () => closePopup(popupAvatar));
  if (closePassword)
    closePassword.addEventListener("click", () => closePopup(popupPassword));

  window.addEventListener("click", (e) => {
    if (e.target === popupAvatar) closePopup(popupAvatar);
    if (e.target === popupPassword) closePopup(popupPassword);
  });

  const avatarItems = document.querySelectorAll(".avatar-item");
  const avatarInput = document.getElementById("selectedAvatarInput");

  avatarItems.forEach((item) => {
    item.addEventListener("click", function () {
      avatarItems.forEach((i) => i.classList.remove("selected"));
      this.classList.add("selected");
      const id = this.getAttribute("data-id");
      if (avatarInput) avatarInput.value = id;
      console.log("Avatar selecionado:", id);
    });
  });
});

const urlParams = new URLSearchParams(window.location.search);
  const successParam = urlParams.get('success');
  const errorParam = urlParams.get('error');

  const messages = {
    'password_updated': { text: 'Palavra-passe alterada com sucesso!', type: 'success' },
    'avatar_updated':   { text: 'Avatar atualizado!', type: 'success' },
    'mismatch':         { text: 'As palavras-passe não coincidem.', type: 'error' },
    'wrong_current':    { text: 'A palavra-passe atual está errada.', type: 'error' },
    'empty_fields':     { text: 'Preenche todos os campos obrigatórios.', type: 'error' },
    'server':           { text: 'Erro interno do servidor.', type: 'error' }
  };

  if (successParam && messages[successParam]) {
    showToast(messages[successParam].text, messages[successParam].type);
    cleanUrl();
  } else if (errorParam && messages[errorParam]) {
    showToast(messages[errorParam].text, messages[errorParam].type);
    cleanUrl();
  }

  function showToast(msg, type) {
    const container = document.getElementById('toast-container');
    if (!container) return; 

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'times-circle';

    toast.innerHTML = `<i class="fas fa-${icon}"></i> ${msg}`;
    
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = "opacity 0.5s ease";
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
  }

  function cleanUrl() {
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.replaceState({path: newUrl}, '', newUrl);
  }
let movieToDeleteId = null;
const confirmModal = document.getElementById('confirm-modal');
const btnConfirm = document.getElementById('btn-modal-confirm');
const btnCancel = document.getElementById('btn-modal-cancel');

window.removerFilme = (id) => {
    movieToDeleteId = id;
    if (confirmModal) confirmModal.style.display = 'flex';
};

if (btnCancel) {
    btnCancel.addEventListener('click', () => {
        confirmModal.style.display = 'none';
        movieToDeleteId = null;
    });
}

if (btnConfirm) {
    btnConfirm.addEventListener('click', async () => {
        if (!movieToDeleteId) return;
        confirmModal.style.display = 'none';

        try {
            const res = await fetch('/watchlist/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movieId: movieToDeleteId })
            });
            
            const data = await res.json();

            if (data.success) {
                const el = document.getElementById(`movie-${movieToDeleteId}`);
                if(el) {
                    el.style.transition = 'opacity 0.5s, transform 0.5s';
                    el.style.opacity = '0';
                    el.style.transform = 'scale(0.8)';
                    setTimeout(() => el.remove(), 500);
                }
                createToast('Filme removido da watchlist!', 'success');
            } else {
                createToast('Erro ao remover filme.', 'error');
            }
        } catch (err) {
            console.error(err);
            createToast('Erro de conexão.', 'error');
        }
    });
}

window.addEventListener('click', (e) => {
    if (e.target === confirmModal) confirmModal.style.display = 'none';
});

function createToast(msg, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = type === 'success' ? 'check-circle' : 'times-circle';
    toast.innerHTML = `<i class="fas fa-${icon}"></i> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  const startDateInput = document.getElementById('start-date');
  const endDateInput = document.getElementById('end-date');
  const watchlistContainer = document.getElementById('watchlist-movies');

  if (typeof window.globalWatchlistData === 'undefined' || !watchlistContainer) {
    console.error('Dados da watchlist não disponíveis.');
    return;
  }

  function convertInputtoISO(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts[0].length === 4) {
      return dateStr;
    } else if (parts[0].length === 2 && parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return null;
  }

  function applyDateFilter() {
    const rawStartDate = startDateInput ? startDateInput.value : '';
    const rawEndDate = endDateInput ? endDateInput.value : '';

    const sqlliteStartDate = convertInputtoISO(rawStartDate);
    const sqlliteEndDate = convertInputtoISO(rawEndDate);

    let filteredMovies = (window.globalWatchlistData || []).slice();

    if (!sqlliteStartDate && !sqlliteEndDate) {
      updateWatchlistDisplay(filteredMovies);
      return;
    }

    const StartDate = sqlliteStartDate ? new Date(sqlliteStartDate) : null;
    const EndDate = sqlliteEndDate ? new Date(sqlliteEndDate) : null;

    filteredMovies = filteredMovies.filter(movie => {
      const rawMovieDate = movie.Data_de_Lancamento || movie.full_date || movie.fullDate || movie.Data_de_Lancamento;
      if (!rawMovieDate) return false;
      const asString = String(rawMovieDate).trim();

      let movieDateObj = null;
      if (/^\d{4}$/.test(asString)) {
        movieDateObj = new Date(Number(asString), 0, 1);
      } else {
        const parsed = new Date(asString);
        if (!isNaN(parsed)) movieDateObj = parsed;
      }
      if (!movieDateObj) return false;

      if (StartDate && EndDate) {
        return movieDateObj >= StartDate && movieDateObj <= EndDate;
      } else if (StartDate) {
        return movieDateObj >= StartDate;
      } else if (EndDate) {
        return movieDateObj <= EndDate;
      }
      return true;
    });

    updateWatchlistDisplay(filteredMovies);
  }

  function updateWatchlistDisplay(movies) {
    watchlistContainer.innerHTML = '';
    if (!movies || movies.length === 0) {
      watchlistContainer.innerHTML = '<p>Nenhum filme encontrado para os critérios selecionados.</p>';
      return;
    }

  const genreFilterSelect = document.getElementById('filtro-genero');
  const SortSelect = document.getElementById('ordenar-watchlist');

  function applyFilters() {
    let currentData = (window.globalWatchlistData || []).slice();

    const selectedGenre = genreFilterSelect ? genreFilterSelect.value : 'todos';
    const rawStartDate = startDateInput ? startDateInput.value : '';
    const rawEndDate = endDateInput ? endDateInput.value : '';
    const sqlliteStartDate = convertInputtoISO(rawStartDate);
    const sqlliteEndDate = convertInputtoISO(rawEndDate);
    const StartDate = sqlliteStartDate ? new Date(sqlliteStartDate) : null;
    const EndDate = sqlliteEndDate ? new Date(sqlliteEndDate) : null;

    if (StartDate || EndDate) {
      currentData = currentData.filter(movie => {
        const rawMovieDate = movie.Data_de_Lancamento || movie.full_date || movie.fullDate || movie.Data_de_Lancamento;
        if (!rawMovieDate) return false;
        const asString = String(rawMovieDate).trim();
        let movieDateObj = null;
        if (/^\d{4}$/.test(asString)) {
          movieDateObj = new Date(Number(asString), 0, 1);
        } else {
          const parsed = new Date(asString);
          if (!isNaN(parsed)) movieDateObj = parsed;
        }
        if (!movieDateObj) return false;
        if (StartDate && EndDate) return movieDateObj >= StartDate && movieDateObj <= EndDate;
        if (StartDate) return movieDateObj >= StartDate;
        if (EndDate) return movieDateObj <= EndDate;
        return true;
      });
    }

    if (selectedGenre && selectedGenre !== 'todos' && selectedGenre !== 'all') {
      currentData = currentData.filter(movie => {
        const gens = movie.Generos || movie.Genero || movie.generos || movie.Genres;
        if (!gens) return false;
        if (Array.isArray(gens)) return gens.includes(selectedGenre);
        if (typeof gens === 'string') return gens.toLowerCase().includes(selectedGenre.toLowerCase());
        return false;
      });
    }

    const sortMethod = SortSelect ? SortSelect.value : 'data-adicao';

    if (sortMethod === 'titulo-asc' || sortMethod === 'title_asc') {
      currentData.sort((a, b) => (a.title || '').toString().localeCompare((b.title || '').toString()));
    } else if (sortMethod === 'titulo-desc' || sortMethod === 'title_desc') {
      currentData.sort((a, b) => (b.title || '').toString().localeCompare((a.title || '').toString()));
    } else if (sortMethod === 'recente-antigo') {
      currentData.sort((a, b) => new Date(b.Data_de_Lancamento) - new Date(a.Data_de_Lancamento));
    } else if (sortMethod === 'antigo-recente') {
      currentData.sort((a, b) => new Date(a.Data_de_Lancamento) - new Date(b.Data_de_Lancamento));
    } else if (sortMethod === 'data-adicao') {
      currentData.sort((a, b) => (b.SWIPE_ID || 0) - (a.SWIPE_ID || 0));
    }

    updateWatchlistDisplay(currentData);
  }

  if (genreFilterSelect) genreFilterSelect.addEventListener('change', applyFilters);
  if (SortSelect) SortSelect.addEventListener('change', applyFilters);

    movies.forEach(movie => {
      const li = document.createElement('li');
      const movieId = movie.tmbd_ID || movie.id || movie.TMDB_ID || movie.tmbdId || '';
      const poster = movie.poster || movie.Capa || movie.capa || '';
      const title = movie.title || movie.Titulo || '';

      li.id = `movie-${movieId}`;
      li.className = 'movie-item';
      li.innerHTML = `
        <a href="/details/${movieId}" class="movie-link">
          <img src="${poster}" alt="${title}" class="movie-poster">
        </a>
        <div class="trash-circle" onclick="event.stopPropagation(); removerFilme('${movieId}')">
          <img src="/img/lixo.png" alt="Remover">
        </div>
      `;
      watchlistContainer.appendChild(li);
    });
  }

  if (startDateInput) {
    startDateInput.addEventListener('input', applyDateFilter);
    startDateInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyDateFilter(); } });
  }
  if (endDateInput) {
    endDateInput.addEventListener('input', applyDateFilter);
    endDateInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyDateFilter(); } });
  }

  // Initial render
  updateWatchlistDisplay(window.globalWatchlistData || []);
});
