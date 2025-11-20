document.addEventListener('DOMContentLoaded', function() {
  const cards = document.querySelectorAll('.card');

  cards.forEach(card => {
    // toggle flip on click
    card.addEventListener('click', function (e) {
      card.classList.toggle('is-flipped');
    });

    // close when mouse leaves the member container
    const membro = card.closest('.membro');
    if (membro) {
      membro.addEventListener('mouseleave', function () {
        card.classList.remove('is-flipped');
      });
    }

    // keyboard: Enter or Space toggles
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        card.classList.toggle('is-flipped');
      }
    });

    // focusout: when focus leaves the card, unflip
    card.addEventListener('focusout', function (e) {
      // if the newly focused element is outside the card, close
      const newFocus = e.relatedTarget;
      if (!card.contains(newFocus)) card.classList.remove('is-flipped');
    });
  });

  // optional: click outside to close any flipped cards
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.card')) {
      document.querySelectorAll('.card.is-flipped').forEach(c => c.classList.remove('is-flipped'));
    }
  });

  // --- Dark-mode social icon swapping ---
  const socialIcons = document.querySelectorAll('.card__back .social-icon');

  socialIcons.forEach(img => {
    if (!img.dataset.originalSrc) img.dataset.originalSrc = img.getAttribute('src');
    const original = img.dataset.originalSrc;

    // build a "white" variant filename by inserting ' white' before the extension
    try {
      const url = new URL(original, window.location.origin);
      const dir = url.pathname.replace(/\/[^\/]*$/, '/');
      const filename = decodeURIComponent(url.pathname.split('/').pop());
      const dot = filename.lastIndexOf('.');
      if (dot !== -1) {
        const whiteName = filename.slice(0, dot) + ' white' + filename.slice(dot);
        img.dataset.whiteSrc = dir + encodeURIComponent(whiteName);
      } else {
        img.dataset.whiteSrc = original;
      }
    } catch (err) {
      img.dataset.whiteSrc = original;
    }

    // if the white image fails to load, fallback to original and mark for CSS filter
    const onErr = function () {
      img.removeEventListener('error', onErr);
      img.setAttribute('src', img.dataset.originalSrc);
      img.classList.add('icon-fallback');
    };
    img.addEventListener('error', onErr);
  });

  function applyIconTheme(isDark) {
    socialIcons.forEach(img => {
      const original = img.dataset.originalSrc || img.getAttribute('src');
      const white = img.dataset.whiteSrc || original;
      if (isDark) {
        if (img.getAttribute('src') !== white) img.setAttribute('src', white);
      } else {
        if (img.getAttribute('src') !== original) img.setAttribute('src', original);
        img.classList.remove('icon-fallback');
      }
    });
  }

  // apply on load
  applyIconTheme(document.body.classList.contains('dark-mode'));

  // watch for body class changes to react to theme toggles
  const bodyObserver = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.attributeName === 'class') {
        applyIconTheme(document.body.classList.contains('dark-mode'));
      }
    }
  });
  bodyObserver.observe(document.body, { attributes: true });
});
