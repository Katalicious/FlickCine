document.addEventListener("DOMContentLoaded", function () {
  const btnAvatar = document.getElementById("alterar-avatar");
  const btnPassword = document.getElementById("alterar-password");
  const popupAvatar = document.getElementById("popup-avatar");
  const popupPassword = document.getElementById("popup-password");
  const closeAvatar = document.getElementById("close-avatar");
  const closePassword = document.getElementById("close-password");

  function openPopup(el) { if(el) el.style.display = "flex"; }
  function closePopup(el) { if(el) el.style.display = "none"; }

  if (btnAvatar) btnAvatar.addEventListener("click", (e) => { e.preventDefault(); openPopup(popupAvatar); });
  if (btnPassword) btnPassword.addEventListener("click", (e) => { e.preventDefault(); openPopup(popupPassword); });
  
  if (closeAvatar) closeAvatar.addEventListener("click", () => closePopup(popupAvatar));
  if (closePassword) closePassword.addEventListener("click", () => closePopup(popupPassword));

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
      if (avatarInput) avatarInput.value = this.getAttribute("data-id");
    });
  });

  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get('success');
  const error = urlParams.get('error');

  const messages = {
    'password_updated': { text: 'Palavra-passe alterada com sucesso!', type: 'success' },
    'avatar_updated':   { text: 'Avatar atualizado!', type: 'success' },
    'mismatch':         { text: 'As palavras-passe não coincidem.', type: 'error' },
    'wrong_current':    { text: 'A palavra-passe atual está errada.', type: 'error' },
    'empty_fields':     { text: 'Preenche todos os campos.', type: 'error' },
    'server':           { text: 'Erro de servidor.', type: 'error' }
  };

  if (success && messages[success]) showToast(messages[success].text, messages[success].type);
  if (error && messages[error]) showToast(messages[error].text, messages[error].type);

  if (success || error) cleanUrl();

  const selectGenero = document.getElementById('filtro-genero');
  const selectOrdem = document.getElementById('ordenar-watchlist');
  const inputInicio = document.getElementById('start-date') || document.getElementById('data-inicio');
  const inputFim = document.getElementById('end-date') || document.getElementById('data-fim');
  const containerLista = document.getElementById('watchlist-movies');

  const filmesOriginais = window.globalWatchlistData || [];

  function normalizar(texto) {
    return texto ? texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
  }

  function atualizarLista() {
    let resultados = [...filmesOriginais];

    if (selectGenero && selectGenero.value !== 'todos') {
        const generoEscolhido = normalizar(selectGenero.value);
        resultados = resultados.filter(filme => {
            const generosFilme = normalizar(filme.Generos || filme.genres || "");
            return generosFilme.includes(generoEscolhido);
        });
    }

    const inicioVal = inputInicio ? inputInicio.value : null;
    const fimVal = inputFim ? inputFim.value : null;

    if (inicioVal || fimVal) {
        const dataInicio = inicioVal ? new Date(inicioVal) : null;
        const dataFim = fimVal ? new Date(fimVal) : null;

        resultados = resultados.filter(filme => {
            const dataStr = filme.Data_de_Lancamento || filme.Data_de_Lançamento || filme.full_date;
            if (!dataStr) return false;
            
            const dataFilme = new Date(dataStr);
            if (isNaN(dataFilme)) return false;

            if (dataInicio && dataFilme < dataInicio) return false;
            if (dataFim && dataFilme > dataFim) return false;
            
            return true;
        });
    }
    if (selectOrdem) {
        const ordem = selectOrdem.value;
        resultados.sort((a, b) => {
            const titleA = (a.title || a.Titulo || "").toString().toLowerCase();
            const titleB = (b.title || b.Titulo || "").toString().toLowerCase();
            const dateA = new Date(a.Data_de_Lancamento || a.Data_de_Lançamento || 0);
            const dateB = new Date(b.Data_de_Lancamento || b.Data_de_Lançamento || 0);
            const idA = a.SWIPE_ID || 0;
            const idB = b.SWIPE_ID || 0;

            if (ordem === 'titulo-asc') return titleA.localeCompare(titleB);
            if (ordem === 'titulo-desc') return titleB.localeCompare(titleA);
            if (ordem === 'recente-antigo') return dateB - dateA; 
            if (ordem === 'antigo-recente') return dateA - dateB; 
            if (ordem === 'data-adicao') return idB - idA;
            return 0;
        });
    }

    renderizarHTML(resultados);
  }

  function renderizarHTML(lista) {
    if (!containerLista) return;
    containerLista.innerHTML = '';

    if (lista.length === 0) {
        containerLista.innerHTML = '<li style="width:100%; text-align:center; color:#777; list-style:none;"><p>Nenhum filme encontrado.</p></li>';
        return;
    }

    lista.forEach(movie => {
        const li = document.createElement('li');
        const id = movie.tmbd_ID || movie.id;
        const poster = movie.poster || movie.Capa;
        const title = movie.title || movie.Titulo;

        li.id = `movie-${id}`;
        li.className = 'movie-card-item';
        
        li.innerHTML = `
            <a href="/details/${id}" class="movie-link">
                <img src="${poster}" alt="${title}" class="movie-poster">
            </a>
            <div class="trash-circle" onclick="event.stopPropagation(); removerFilme('${id}')" title="Remover">
                <img src="/img/lixo.png" alt="Remover">
            </div>
        `;
        containerLista.appendChild(li);
    });
  }

  if (selectGenero) selectGenero.addEventListener('change', atualizarLista);
  if (selectOrdem) selectOrdem.addEventListener('change', atualizarLista);
  if (inputInicio) inputInicio.addEventListener('change', atualizarLista);
  if (inputFim) inputFim.addEventListener('change', atualizarLista);

  atualizarLista();
});

function showToast(msg, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    let icon = type === 'success' ? 'check-circle' : 'times-circle';
    t.innerHTML = `<i class="fas fa-${icon}"></i> ${msg}`;
    container.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 500);
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
                if(el) el.remove();

                if (window.globalWatchlistData) {
                    window.globalWatchlistData = window.globalWatchlistData.filter(m => (m.id || m.tmbd_ID) != movieToDeleteId);
                }

                showToast('Removido com sucesso!', 'success');
            } else {
                showToast('Erro ao remover.', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Erro de conexão.', 'error');
        }
    });
}

window.addEventListener('click', (e) => {
    if (e.target === confirmModal) confirmModal.style.display = 'none';
});