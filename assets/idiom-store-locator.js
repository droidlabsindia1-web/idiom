/* ============================================
   idiom — Store Locator
   - With a Google Maps API key: interactive JS map + custom red marker.
   - Without a key: keyless Google Maps embed + overlaid red pin button.
   Clicking the pin opens an info-window style popover above it.
   ============================================ */
(function () {
  if (customElements.get('idiom-store-map')) return;

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

  // Visitor position is requested once per page and shared by every store popup
  var visitorPosPromise = null;
  function getVisitorPosition() {
    if (visitorPosPromise) return visitorPosPromise;
    visitorPosPromise = new Promise(function (resolve, reject) {
      if (!navigator.geolocation) return reject(new Error('Geolocation unavailable'));
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        function (err) {
          visitorPosPromise = null; // let a later popup ask again
          reject(err);
        },
        { maximumAge: 600000, timeout: 10000 }
      );
    });
    return visitorPosPromise;
  }

  function distanceKm(a, b) {
    var R = 6371;
    var toRad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * toRad;
    var dLng = (b.lng - a.lng) * toRad;
    var h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function formatDistance(km) {
    if (km < 1) return Math.round(km * 1000) + 'm';
    if (km < 10) return km.toFixed(1) + 'km';
    return Math.round(km) + 'km';
  }

  class IdiomStoreMap extends HTMLElement {
    connectedCallback() {
      this.mapEl = this.querySelector('[data-map]');
      this.popoverEl = this.querySelector('[data-store-popover]');
      this.open = this.open.bind(this);
      this.close = this.close.bind(this);
      this.onDocClick = this.onDocClick.bind(this);
      this.onKeydown = this.onKeydown.bind(this);

      this.querySelectorAll('[data-open-store-modal]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggle(btn);
        });
      });
      this.querySelectorAll('[data-popover-close]').forEach((btn) => {
        btn.addEventListener('click', () => this.close(true));
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
      this.close(false);
    }

    get isOpen() {
      return this.popoverEl && !this.popoverEl.hidden;
    }

    toggle(trigger) {
      if (this.isOpen) this.close(true);
      else this.open(trigger);
    }

    open(trigger) {
      if (!this.popoverEl || this.isOpen) return;
      this.trigger = trigger && trigger.focus ? trigger : null;

      // JS map: bring the marker back to centre so the popover arrow points at it
      if (this.map && this.position) this.map.setCenter(this.position);

      this.popoverEl.hidden = false;
      if (this.trigger) this.trigger.setAttribute('aria-expanded', 'true');
      var closeBtn = this.popoverEl.querySelector('[data-popover-close]');
      if (closeBtn) closeBtn.focus({ preventScroll: true });

      // The popover opens upwards over the content; if its top is under the
      // sticky header / off-screen, scroll just enough to reveal it
      var header = document.querySelector('[data-site-header]');
      var offset = (header ? header.getBoundingClientRect().bottom : 0) + 16;
      var top = this.popoverEl.getBoundingClientRect().top;
      if (top < offset) window.scrollBy({ top: top - offset, behavior: 'smooth' });

      // Next tick, so the click that opened the popover doesn't immediately close it
      setTimeout(() => {
        if (this.isOpen) document.addEventListener('click', this.onDocClick);
      }, 0);
      document.addEventListener('keydown', this.onKeydown);
      this.updateDistance();
    }

    close(restoreFocus) {
      if (!this.isOpen) return;
      this.popoverEl.hidden = true;
      if (this.trigger) {
        this.trigger.setAttribute('aria-expanded', 'false');
        if (restoreFocus) this.trigger.focus({ preventScroll: true });
      }
      document.removeEventListener('click', this.onDocClick);
      document.removeEventListener('keydown', this.onKeydown);
    }

    onDocClick(e) {
      if (!this.popoverEl.contains(e.target)) this.close(false);
    }

    onKeydown(e) {
      if (e.key === 'Escape') this.close(true);
    }

    updateDistance() {
      var row = this.popoverEl.querySelector('[data-distance]');
      if (!row || row.dataset.done) return;
      var d = this.mapEl.dataset;
      var store = { lat: parseFloat(d.lat), lng: parseFloat(d.lng) };
      if (isNaN(store.lat) || isNaN(store.lng)) return;

      getVisitorPosition()
        .then((visitor) => {
          row.querySelector('[data-distance-value]').textContent = formatDistance(distanceKm(visitor, store));
          row.hidden = false;
          row.dataset.done = 'true';
        })
        .catch(function () {
          /* permission denied / unavailable: row stays hidden */
        });
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
          this.position = { lat: lat, lng: lng };

          this.map = new maps.Map(canvas, {
            center: this.position,
            zoom: parseInt(d.zoom, 10) || 16,
            styles: d.style === 'muted' ? MUTED_STYLE : null,
            disableDefaultUI: true,
            zoomControl: true,
            gestureHandling: 'cooperative',
            clickableIcons: false
          });

          var marker = new maps.Marker({
            position: this.position,
            map: this.map,
            title: d.title || '',
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(PIN_SVG),
              scaledSize: new maps.Size(40, 52),
              anchor: new maps.Point(20, 52)
            }
          });
          marker.addListener('click', (e) => {
            if (e && e.domEvent) e.domEvent.stopPropagation();
            this.toggle(null);
          });

          // The popover is anchored to the map centre, so close it once the map moves
          this.map.addListener('dragstart', () => this.close(false));
          this.map.addListener('zoom_changed', () => this.close(false));

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

  customElements.define('idiom-store-map', IdiomStoreMap);
})();
