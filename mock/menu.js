// opens the phone menu, to check that the bottom contact bar is hidden while the menu is open (31.10.2026)
(() => {
  const a = [...document.querySelectorAll('a,button,[role=button]')].find((x) => x.offsetParent && (/off_canvas|off-canvas/.test(decodeURIComponent(x.getAttribute('href') || '')) || x.matches('.elementor-menu-toggle')));
  if (a) a.click();
  document.body.setAttribute('data-menu-clicked', a ? '1' : '0');
})();
