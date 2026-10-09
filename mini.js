// language: JavaScript, file: mini.js, runtime: Electron renderer (mini window)
const coverWrap = document.getElementById('coverWrap');
const miniTitle = document.getElementById('miniTitle');
const miniArtist = document.getElementById('miniArtist');
const miniPrev = document.getElementById('miniPrev');
const miniPlay = document.getElementById('miniPlay');
const miniNext = document.getElementById('miniNext');
const miniExpand = document.getElementById('miniExpand');
const miniHide = document.getElementById('miniHide');

let dragging = false, lastX = 0, lastY = 0;
let lastFile = null;
let currentCoverEl = document.getElementById('coverA');
let animating = false;

/* ---------- Drag ---------- */

document.addEventListener('mousedown', (e) => {
  if (e.target.closest('button')) return;
  dragging = true;
  lastX = e.screenX;
  lastY = e.screenY;
});
window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  const dx = e.screenX - lastX;
  const dy = e.screenY - lastY;
  lastX = e.screenX;
  lastY = e.screenY;
  window.api.miniDrag({ dx, dy });
});
window.addEventListener('mouseup', () => { dragging = false; });

/* ---------- Buttons ---------- */

miniPlay.addEventListener('click', () => window.api.miniCmd('playpause'));
miniPrev.addEventListener('click', () => window.api.miniCmd('prev'));
miniNext.addEventListener('click', () => window.api.miniCmd('next'));
miniExpand.addEventListener('click', () => window.api.miniClose());
miniHide.addEventListener('click', () => window.api.miniClose());

/* ---------- State ---------- */

window.api.onMiniState((state) => {
  if (!state) return;

  // Тема
  document.body.classList.toggle('light', !!state.themeLight);

  // Текст — плавный fade если изменился
  if (miniTitle.textContent !== (state.title || 'Нет трека')) {
    miniTitle.classList.add('text-swap');
    miniArtist.classList.add('text-swap');
    setTimeout(() => {
      miniTitle.textContent = state.title || 'Нет трека';
      miniArtist.textContent = state.artist || '—';
      miniTitle.classList.remove('text-swap');
      miniArtist.classList.remove('text-swap');
    }, 150);
  } else {
    miniArtist.textContent = state.artist || '—';
  }

  // Кнопка play/pause
  miniPlay.textContent = state.paused ? '▶' : '⏸';

  // Смена обложки с анимацией
  const newFile = state.file || '';
  if (newFile !== lastFile) {
    animateCoverChange(state.cover, newFile);
    lastFile = newFile;
  } else if (state.cover) {
    currentCoverEl.style.backgroundImage = `url("${state.cover}")`;
  }
});

/* ---------- Cover animation ---------- */

function animateCoverChange(coverUrl, newFile) {
  if (animating) return;
  animating = true;

  const outgoing = currentCoverEl;
  const incoming = document.createElement('div');
  incoming.className = 'mini-cover-img';
  incoming.style.backgroundImage = coverUrl ? `url("${coverUrl}")` : '';
  incoming.style.transform = 'translateX(120%)';
  incoming.style.opacity = '0';
  coverWrap.appendChild(incoming);

  // направление: всегда слева уходит — справа влетает
  outgoing.classList.add('fly-out-left');
  incoming.classList.add('fly-in-right');

  setTimeout(() => {
    outgoing.remove();
    incoming.classList.remove('fly-in-right');
    incoming.style.transform = '';
    incoming.style.opacity = '';
    currentCoverEl = incoming;
    animating = false;
  }, 360);
}