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