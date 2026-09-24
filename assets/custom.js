/*
* Palo Alto Theme
*
* Use this file to add custom Javascript to Palo Alto.  Keeping your custom
* Javascript in this fill will make it easier to update Palo Alto. In order
* to use this file you will need to open layout/theme.liquid and uncomment
* the custom.js script import line near the bottom of the file.
*/


(function() {
  // Add custom code below this line

  // Strip trailing .00 from ATC button price on PDP
  if (document.body.classList.contains('template-product')) {
    function stripTrailingZeros() {
      document.querySelectorAll('.product__submit__add [data-product-price]').forEach(function(el) {
        if (el.innerHTML.indexOf('.00') !== -1) {
          el.innerHTML = el.innerHTML.replace(/\.00(?=\s*<|$)/g, '');
        }
      });
    }

    // Run on load, after a short delay to catch theme JS initialization, and observe for changes
    stripTrailingZeros();
    setTimeout(stripTrailingZeros, 300);
    setTimeout(stripTrailingZeros, 1000);

    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        if (m.target.innerHTML && m.target.innerHTML.indexOf('.00') !== -1) {
          m.target.innerHTML = m.target.innerHTML.replace(/\.00(?=\s*<|$)/g, '');
        }
      });
    });

    function attachObserver() {
      document.querySelectorAll('.product__submit__add [data-product-price]').forEach(function(el) {
        observer.observe(el, { childList: true, subtree: true, characterData: true });
      });
    }
    attachObserver();
    setTimeout(attachObserver, 500);
  }







  // ^^ Keep your scripts inside this IIFE function call to
  // avoid leaking your variables into the global scope.
})();
