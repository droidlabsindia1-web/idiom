(() => {
  const modal = document.getElementById('idiomFiModal');
  const wrapper = document.getElementById('idiomFiWrapper');
  if (!modal || !wrapper) return;

  // The snippet renders the modal inside the product form/blocks, which have
  // AOS `transform` ancestors. A transformed ancestor makes `position: fixed`
  // resolve against that ancestor (not the viewport), which clips the modal to
  // the content column. Re-parent the modal to <body> so it truly covers the
  // viewport — same as the reel-video-section modal, which is already top-level.
  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }

  let savedScrollY = 0;
  let ignorePopstate = false;

  const MUTED_ICON = 'https://cdn.shopify.com/s/files/1/0635/6929/7637/files/Vector_1_abadcea3-7367-46f9-a264-7f6f302cce5d.svg?v=1748521730';
  const UNMUTED_ICON = 'https://cdn.shopify.com/s/files/1/0635/6929/7637/files/Vector-1_1.svg?v=1748521731';
  const PAUSE_ICON = 'https://cdn.shopify.com/s/files/1/0635/6929/7637/files/pause-button-round-white-icon.svg?v=1752484802';
  const PLAY_ICON = 'https://cdn.shopify.com/s/files/1/0635/6929/7637/files/play-button-round-white-icon.svg?v=1752484802';

  const safePlay = (video) => video.play().catch(err => console.warn('Play rejected', video?.src, err));

  const thumbs = Array.from(document.querySelectorAll('.idiom-fi__thumb'));
  if (!thumbs.length) return;

  // Autoplay muted thumbnails when at least 50% visible
  const thumbObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const vid = entry.target.querySelector('video');
      if (!vid) return;
      if (vid.dataset.src) { vid.src = vid.dataset.src; vid.load(); delete vid.dataset.src; }
      if (entry.intersectionRatio >= 0.5) {
        vid.muted = true;
        safePlay(vid);
      } else {
        try { vid.pause(); } catch (e) {}
      }
    });
  }, { threshold: [0.5] });

  thumbs.forEach((thumb, idx) => {
    thumb.dataset.index = String(idx);
    thumbObserver.observe(thumb);
    if (!thumb._idiomFiBound) {
      thumb._idiomFiBound = true;
      thumb.addEventListener('click', () => openFullscreen(idx));
    }
  });

  window.addEventListener('popstate', () => {
    if (modal.style.display === 'block') {
      if (ignorePopstate) { ignorePopstate = false; return; }
      _closeModalCleanup();
    }
  });

  function openFullscreen(clickedIndex) {
    clickedIndex = Math.max(0, Math.min(thumbs.length - 1, Number(clickedIndex) || 0));
    savedScrollY = window.scrollY;

    document.documentElement.classList.add('idiom-fi-modal-open');
    document.body.classList.add('idiom-fi-modal-open');

    try { history.pushState({ idiomFiModal: true }, ''); } catch (e) {}

    wrapper.innerHTML = '';
    thumbs.forEach((thumbEl, idx) => {
      const videoSrc = thumbEl.dataset.videoSrc || thumbEl.getAttribute('data-video-src');
      const buyNowText = thumbEl.dataset.buyNowText || 'Shop Now';
      const buyNowUrl = thumbEl.dataset.buyNowUrl || '#';

      const container = document.createElement('div');
      container.className = 'idiom-fi-fullscreen';
      container.dataset.index = String(idx);

      const box = document.createElement('div');
      box.className = 'idiom-fi-box';

      const video = document.createElement('video');
      video.dataset.src = videoSrc;
      video.loop = true;
      video.playsInline = true;
      video.muted = true;
      video.preload = 'none';
      video.controls = false;

      const muteBtn = document.createElement('button');
      muteBtn.className = 'idiom-fi-mute-btn';
      muteBtn.setAttribute('aria-label', 'Toggle mute');
      const muteIcon = document.createElement('img');
      muteIcon.src = MUTED_ICON;
      muteBtn.appendChild(muteIcon);
      muteBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        video.muted = !video.muted;
        muteIcon.src = video.muted ? MUTED_ICON : UNMUTED_ICON;
      });

      const ppBtn = document.createElement('button');
      ppBtn.className = 'idiom-fi-playpause-btn';
      ppBtn.setAttribute('aria-label', 'Play / Pause');
      const ppIcon = document.createElement('img');
      ppIcon.src = PAUSE_ICON;
      ppBtn.appendChild(ppIcon);

      box.addEventListener('click', () => {
        if (video.paused) {
          safePlay(video);
          ppIcon.src = PAUSE_ICON;
        } else {
          try { video.pause(); } catch (e) {}
          ppIcon.src = PLAY_ICON;
        }
        ppBtn.classList.add('show');
        clearTimeout(ppBtn._hideTimer);
        ppBtn._hideTimer = setTimeout(() => ppBtn.classList.remove('show'), 1500);
      });

      const children = [video, muteBtn, ppBtn];
      if (buyNowUrl && buyNowUrl !== '#') {
        const buyBtn = document.createElement('a');
        buyBtn.className = 'idiom-fi-buy-btn';
        buyBtn.href = buyNowUrl;
        buyBtn.innerText = buyNowText;
        children.push(buyBtn);
      }

      box.append(...children);
      container.appendChild(box);
      wrapper.appendChild(container);
    });

    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');

    requestAnimationFrame(() => {
      const target = wrapper.querySelector(`.idiom-fi-fullscreen[data-index="${clickedIndex}"]`);
      if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
    });

    if (window._idiomFiVerticalObserver) window._idiomFiVerticalObserver.disconnect();
    window._idiomFiVerticalObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const vid = entry.target.querySelector('video');
        const icon = entry.target.querySelector('.idiom-fi-playpause-btn img');
        if (!vid) return;
        if (entry.isIntersecting && vid.dataset.src) {
          vid.src = vid.dataset.src;
          vid.load();
          delete vid.dataset.src;
        }
        if (entry.intersectionRatio >= 0.75) {
          vid.muted = true;
          safePlay(vid);
          if (icon) icon.src = PAUSE_ICON;
        } else {
          try { vid.pause(); } catch (e) {}
          if (icon) icon.src = PLAY_ICON;
        }
      });
    }, { threshold: [0.25, 0.5, 0.75, 1] });

    wrapper.querySelectorAll('.idiom-fi-fullscreen').forEach(c => window._idiomFiVerticalObserver.observe(c));
  }

  function _closeModalCleanup() {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    wrapper.innerHTML = '';
    if (window._idiomFiVerticalObserver) {
      try { window._idiomFiVerticalObserver.disconnect(); } catch (e) {}
      window._idiomFiVerticalObserver = null;
    }
    document.documentElement.classList.remove('idiom-fi-modal-open');
    document.body.classList.remove('idiom-fi-modal-open');
    window.scrollTo(0, savedScrollY || 0);
  }

  window.idiomCloseFi = function () {
    if (modal.style.display !== 'block') return;
    _closeModalCleanup();
    try {
      if (history.state && history.state.idiomFiModal) {
        ignorePopstate = true;
        history.back();
      }
    } catch (e) {}
  };
})();
