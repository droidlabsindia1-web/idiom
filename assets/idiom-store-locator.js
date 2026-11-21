/* ============================================
   idiom — Store Locator
   - With a Google Maps API key: interactive JS map + custom red marker.
   - Without a key: keyless Google Maps embed + overlaid red pin button.
   Clicking the pin opens the store details <dialog>.
   ============================================ */
(function () {
  if (customElements.get('idiom-store-locator')) return;

  var PIN_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">' +
    '<path d="M20 0C9 0 0 8.9 0 19.9 0 34.8 20 52 20 52s20-17.2 20-32.1C40 8.9 31 0 20 0z" fill="#E53935"/>' +
    '<path d="M20 1.5C9.8 1.5 1.5 9.7 1.5 19.9 1.5 33.5 20 50 20 50" fill="none" stroke="#B71C1C" stroke-width="1.5" opacity=".5"/>' +
    '<circle cx="20" cy="19" r="7" fill="#fff"/></svg>';

  // Muted, cream-toned map style to sit with the brand palette
  var MUTED_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#f3efe6' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#5c5a52' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#fffbf3' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ebe5d8' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cfd8d4' }] },
    { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#ece6d9' }] }
  ];

  // Load the Maps JS API only once per page, however many sections use it
  var mapsPromise = null;
  function loadGoogleMaps(key) {
    if (window.google && window.google.maps && window.google.maps.Map) return Promise.resolve(window.google.maps);
    if (mapsPromise) return mapsPromise;
    mapsPromise = new Promise(function (resolve, reject) {
      var cb = '__idiomMapsReady';
      window[cb] = function () {
        resolve(window.google.maps);
      };
      var s = document.createElement('script');
      s.src =
        'https://maps.googleapis.com/maps/api/js?key=' +
        encodeURIComponent(key) +
        '&callback=' + cb + '&loading=async';
      s.async = true;
      s.onerror = function () {
        mapsPromise = null;
        reject(new Error('Google Maps failed to load'));
      };
      document.head.appendChild(s);
    });
    return mapsPromise;
  }

  class IdiomStoreLocator extends HTMLElement {
    connectedCallback() {
      this.mapEl = this.querySelector('[data-map]');
      this.dialog = this.querySelector('dialog');
      this.openModal = this.openModal.bind(this);

      if (this.dialog) {
        // Close on backdrop click (clicks on the dialog element itself, outside its content box)
        this.dialog.addEventListener('click', (e) => {
          if (e.target === this.dialog) this.dialog.close();
        });
        this.querySelectorAll('[data-modal-close]').forEach((btn) => {
          btn.addEventListener('click', () => this.dialog.close());
        });
      }

      this.querySelectorAll('[data-open-store-modal]').forEach((btn) => {
        btn.addEventListener('click', this.openModal);
      });

      if (!this.mapEl || !this.mapEl.dataset.apiKey) return;

      // Lazy-init the JS map when it nears the viewport (saves API loads)
      if ('IntersectionObserver' in window) {
        this.io = new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.isIntersecting)) {
              this.io.disconnect();
              this.initJsMap();
            }
          },
          { rootMargin: '200px' }
        );
        this.io.observe(this.mapEl);
      } else {
        this.initJsMap();
      }
    }

    disconnectedCallback() {
      if (this.io) this.io.disconnect();
      if (this.dialog && this.dialog.open) this.dialog.close();
    }

    openModal() {
      if (!this.dialog) return;
      if (typeof this.dialog.showModal === 'function') {
        this.dialog.showModal();
      } else {
        this.dialog.setAttribute('open', '');
      }
    }

    initJsMap() {
      var d = this.mapEl.dataset;
      var lat = parseFloat(d.lat);
      var lng = parseFloat(d.lng);
      if (isNaN(lat) || isNaN(lng)) return; // keep the embed fallback

      loadGoogleMaps(d.apiKey)
        .then((maps) => {
          var canvas = document.createElement('div');
          canvas.className = 'idiom-store-locator__map-canvas';
          var position = { lat: lat, lng: lng };

          var map = new maps.Map(canvas, {
            center: position,
            zoom: parseInt(d.zoom, 10) || 16,
            styles: d.style === 'muted' ? MUTED_STYLE : null,
            disableDefaultUI: true,
            zoomControl: true,
            gestureHandling: 'cooperative',
            clickableIcons: false
          });

          var marker = new maps.Marker({
            position: position,
            map: map,
            title: d.title || '',
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(PIN_SVG),
              scaledSize: new maps.Size(40, 52),
              anchor: new maps.Point(20, 52)
            }
          });
          marker.addListener('click', this.openModal);

          // Swap the embed fallback out for the live map
          this.mapEl.querySelectorAll('[data-map-fallback]').forEach((el) => el.remove());
          this.mapEl.appendChild(canvas);
        })
        .catch(function (err) {
          // Embed fallback stays in place
          console.warn('[idiom-store-locator]', err.message);
        });
    }
  }

  customElements.define('idiom-store-locator', IdiomStoreLocator);
})();
