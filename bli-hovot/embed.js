/* בלי חובות: auto height for embedded calculators. Optional: without it the iframe keeps the height in its style. */
(function () {
  if (window.__blihovotEmbed) return; window.__blihovotEmbed = 1;
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.blihovot !== 'h' || typeof d.h !== 'number') return;
    if (!/(^https:\/\/(www\.)?blihovot\.co\.il$)|(\.github\.io$)/.test(e.origin)) return;
    var frames = document.querySelectorAll('iframe[data-blihovot]');
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === e.source) frames[i].style.height = Math.min(Math.max(d.h + 6, 300), 3000) + 'px';
    }
  });
})();
