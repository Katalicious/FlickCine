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
