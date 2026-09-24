(() => {
  const modal = document.getElementById('idiomReelModal');
  const wrapper = document.getElementById('idiomReelWrapper');
  if (!modal || !wrapper) return;

  let savedScrollY = 0;
  let ignorePopstate = false;

  const safePlay = (video) => video.play().catch(err => console.warn('Play rejected', video?.src, err));

  const cards = Array.from(document.querySelectorAll('.idiom-reel-card'));

  // Lazy-load thumbnails via IntersectionObserver
  const lazyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const vid = entry.target.querySelector('video');
      if (vid && vid.dataset.src) {
        vid.src = vid.dataset.src;
        vid.load();
        delete vid.dataset.src;
      }
    });
  }, { rootMargin: '50px' });

  // Autoplay muted in horizontal slider when ≥60% visible
  const sliderObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const vid = entry.target.querySelector('video');
      if (!vid) return;
      if (vid.dataset.src) { vid.src = vid.dataset.src; vid.load(); delete vid.dataset.src; }
      if (entry.intersectionRatio >= 0.6) {
        vid.muted = true;
        safePlay(vid);
      } else {
        try { vid.pause(); } catch(e){}
      }
    });
  }, { threshold: [0.6] });

  cards.forEach((card, idx) => {
    card.dataset.index = String(idx);
    sliderObserver.observe(card);
    lazyObserver.observe(card);
    if (!card._idiomReelBound) {
      card._idiomReelBound = true;
      card.addEventListener('click', () => openFullscreen(idx));
    }
  });

  window.addEventListener('popstate', () => {
    if (modal.style.display === 'block') {
      if (ignorePopstate) { ignorePopstate = false; return; }
      _closeModalCleanup();
    }
  });

  function openFullscreen(clickedIndex) {
    clickedIndex = Math.max(0, Math.min(cards.length - 1, Number(clickedIndex) || 0));
    savedScrollY = window.scrollY;

    document.documentElement.classList.add('idiom-reel-modal-open');
    document.body.classList.add('idiom-reel-modal-open');

    try { history.pushState({ idiomVideoModal: true }, ''); } catch(e) {}

    wrapper.innerHTML = '';
    cards.forEach((cardEl, idx) => {
      const videoSrc = cardEl.dataset.videoSrc || cardEl.getAttribute('data-video-src');
      const buyNowText = cardEl.dataset.buyNowText || 'Shop Now';
      const buyNowUrl = cardEl.dataset.buyNowUrl || '#';

      const container = document.createElement('div');
      container.className = 'idiom-reel-fullscreen';
      container.dataset.index = String(idx);

      const box = document.createElement('div');
      box.className = 'idiom-reel-box';

      const video = document.createElement('video');
      video.dataset.src = videoSrc;
      video.loop = true;
      video.playsInline = true;
      video.muted = true;
      video.preload = 'none';
      video.controls = false;

      const buyBtn = document.createElement('a');
      buyBtn.className = 'idiom-reel-buy-btn';
      buyBtn.href = buyNowUrl;
      buyBtn.innerText = buyNowText;

      const muteBtn = document.createElement('button');
      muteBtn.className = 'idiom-reel-mute-btn';
      muteBtn.setAttribute('aria-label', 'Toggle mute');
      const muteIcon = document.createElement('img');
      muteIcon.src = 'https://cdn.shopify.com/s/files/1/0635/6929/7637/files/Vector_1_abadcea3-7367-46f9-a264-7f6f302cce5d.svg?v=1748521730';
      muteBtn.appendChild(muteIcon);
      muteBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        video.muted = !video.muted;
        muteIcon.src = video.muted
          ? 'https://cdn.shopify.com/s/files/1/0635/6929/7637/files/Vector_1_abadcea3-7367-46f9-a264-7f6f302cce5d.svg?v=1748521730'
          : 'https://cdn.shopify.com/s/files/1/0635/6929/7637/files/Vector-1_1.svg?v=1748521731';
      });

      const ppBtn = document.createElement('button');
      ppBtn.className = 'idiom-reel-playpause-btn';
      ppBtn.setAttribute('aria-label', 'Play / Pause');
      const ppIcon = document.createElement('img');
      ppIcon.src = 'https://cdn.shopify.com/s/files/1/0635/6929/7637/files/pause-button-round-white-icon.svg?v=1752484802';
      ppBtn.appendChild(ppIcon);

      box.addEventListener('click', () => {
        if (video.paused) {
          safePlay(video);
          ppIcon.src = 'https://cdn.shopify.com/s/files/1/0635/6929/7637/files/pause-button-round-white-icon.svg?v=1752484802';
        } else {
          try { video.pause(); } catch(e){}
          ppIcon.src = 'https://cdn.shopify.com/s/files/1/0635/6929/7637/files/play-button-round-white-icon.svg?v=1752484802';
        }
        ppBtn.classList.add('show');
        clearTimeout(ppBtn._hideTimer);
        ppBtn._hideTimer = setTimeout(() => ppBtn.classList.remove('show'), 1500);
      });

      box.append(video, muteBtn, ppBtn, buyBtn);
      container.appendChild(box);
      wrapper.appendChild(container);
    });

    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');

    requestAnimationFrame(() => {
      const target = wrapper.querySelector(`.idiom-reel-fullscreen[data-index="${clickedIndex}"]`);
      if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
    });

    if (window._idiomVerticalObserver) window._idiomVerticalObserver.disconnect();
    window._idiomVerticalObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const vid = entry.target.querySelector('video');
        const icon = entry.target.querySelector('.idiom-reel-playpause-btn img');
        if (!vid) return;
        if (entry.isIntersecting && vid.dataset.src) {
          vid.src = vid.dataset.src;
          vid.load();
          delete vid.dataset.src;
        }
        if (entry.intersectionRatio >= 0.75) {
          vid.muted = true;
          safePlay(vid);
          if (icon) icon.src = 'https://cdn.shopify.com/s/files/1/0635/6929/7637/files/pause-button-round-white-icon.svg?v=1752484802';
        } else {
          try { vid.pause(); } catch(e){}
          if (icon) icon.src = 'https://cdn.shopify.com/s/files/1/0635/6929/7637/files/play-button-round-white-icon.svg?v=1752484802';
        }
      });
    }, { threshold: [0.25, 0.5, 0.75, 1] });

    wrapper.querySelectorAll('.idiom-reel-fullscreen').forEach(c => window._idiomVerticalObserver.observe(c));
  }

  function _closeModalCleanup() {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    wrapper.innerHTML = '';
    if (window._idiomVerticalObserver) {
      try { window._idiomVerticalObserver.disconnect(); } catch(e){}
      window._idiomVerticalObserver = null;
    }
    document.documentElement.classList.remove('idiom-reel-modal-open');
    document.body.classList.remove('idiom-reel-modal-open');
    window.scrollTo(0, savedScrollY || 0);
  }

  window.idiomCloseReel = function() {
    if (modal.style.display !== 'block') return;
    _closeModalCleanup();
    try {
      if (history.state && history.state.idiomVideoModal) {
        ignorePopstate = true;
        history.back();
      }
    } catch(e) {}
  };
})();
