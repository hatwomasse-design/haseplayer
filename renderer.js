// language: JavaScript, file: renderer.js, runtime: Electron renderer
const audio = document.getElementById('audio');
const playBtn = document.getElementById('play');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const shuffleBtn = document.getElementById('shuffle');
const repeatBtn = document.getElementById('repeat');
const openFolderBtn = document.getElementById('openFolder');
const refreshBtn = document.getElementById('refreshBtn');
const settingsBtn = document.getElementById('settingsBtn');
const miniBtn = document.getElementById('miniBtn');
const searchInput = document.getElementById('search');
const playlistEl = document.getElementById('playlist');
const favoritesListEl = document.getElementById('favoritesList');
const scrollThumb = document.getElementById('scrollThumb');
const progress = document.getElementById('progress');
const bar = document.getElementById('bar');
const curEl = document.getElementById('cur');
const durEl = document.getElementById('dur');
const titleEl = document.getElementById('title');
const artistEl = document.getElementById('artist');
const metaEl = document.querySelector('.meta');
const coverEl = document.getElementById('cover');
const coverStack = document.getElementById('coverStack');
const haloEl = document.getElementById('halo');
const volume = document.getElementById('volume');
const volIcon = document.getElementById('volIcon');
const visualizer = document.getElementById('visualizer');

const tabs = document.querySelectorAll('.tab');
const panelTracks = document.getElementById('panelTracks');
const panelFavorites = document.getElementById('panelFavorites');
const panelPlaylists = document.getElementById('panelPlaylists');
const playlistsListEl = document.getElementById('playlistsList');
const savePlaylistBtn = document.getElementById('savePlaylistBtn');

const ctxMenu = document.getElementById('ctxMenu');
const ctxPlay = document.getElementById('ctxPlay');
const ctxFav = document.getElementById('ctxFav');
const ctxAddToPlaylist = document.getElementById('ctxAddToPlaylist');
const ctxInfo = document.getElementById('ctxInfo');
const ctxDelete = document.getElementById('ctxDelete');

const ctxMenuPl = document.getElementById('ctxMenuPl');
const ctxPlPlay = document.getElementById('ctxPlPlay');
const ctxPlOpenFolder = document.getElementById('ctxPlOpenFolder');
const ctxPlDelete = document.getElementById('ctxPlDelete');

const modalBackdrop = document.getElementById('modalBackdrop');
const modalClose = document.getElementById('modalClose');
const setThemeLight = document.getElementById('setThemeLight');
const setRpc = document.getElementById('setRpc');
const setTray = document.getElementById('setTray');
const setNotify = document.getElementById('setNotify');
const setRemember = document.getElementById('setRemember');
const setVisualizer = document.getElementById('setVisualizer');
const setHalo = document.getElementById('setHalo');
const setOnlineCover = document.getElementById('setOnlineCover');
const autoscanBtn = document.getElementById('autoscanBtn');
const autoscanResult = document.getElementById('autoscanResult');
const openFolderInSettings = document.getElementById('openFolderInSettings');
const openPlaylistsInSettings = document.getElementById('openPlaylistsInSettings');
const minimizeBtn = document.getElementById('minimizeBtn');
const quitBtn = document.getElementById('quitBtn');
const sleepResult = document.getElementById('sleepResult');

const infoBackdrop = document.getElementById('infoBackdrop');
const infoClose = document.getElementById('infoClose');
const infoBody = document.getElementById('infoBody');

const pickPlaylistBackdrop = document.getElementById('pickPlaylistBackdrop');
const pickClose = document.getElementById('pickClose');
const pickList = document.getElementById('pickList');
const pickNewName = document.getElementById('pickNewName');
const pickCreate = document.getElementById('pickCreate');

const savePlaylistBackdrop = document.getElementById('savePlaylistBackdrop');
const savePlClose = document.getElementById('savePlClose');
const savePlName = document.getElementById('savePlName');
const savePlConfirm = document.getElementById('savePlConfirm');
const savePlCancel = document.getElementById('savePlCancel');

let tracks = [];
let filtered = [];
let favorites = [];
let index = 0;
let shuffle = false;
let repeatMode = 0;
let currentTab = 'tracks';
let playlists = [];
let activePlaylist = null;
let ctxTrackFile = null;
let ctxPlaylistName = null;
let lastFile = null;
let coverAnimating = false;
let currentCoverEl = coverEl;

/* ---------- Settings ---------- */

const settings = {
  themeLight: JSON.parse(localStorage.getItem('set.themeLight') ?? 'false'),
  rpc: JSON.parse(localStorage.getItem('set.rpc') ?? 'true'),
  tray: JSON.parse(localStorage.getItem('set.tray') ?? 'true'),
  notify: JSON.parse(localStorage.getItem('set.notify') ?? 'false'),
  remember: JSON.parse(localStorage.getItem('set.remember') ?? 'true'),
  visualizer: JSON.parse(localStorage.getItem('set.visualizer') ?? 'true'),
  halo: JSON.parse(localStorage.getItem('set.halo') ?? 'true'),
  onlineCover: JSON.parse(localStorage.getItem('set.onlineCover') ?? 'false')
};

function saveSettings() {
  for (const k in settings) localStorage.setItem('set.' + k, JSON.stringify(settings[k]));
}
function applySettingsToUI() {
  setThemeLight.checked = settings.themeLight;
  setRpc.checked = settings.rpc;
  setTray.checked = settings.tray;
  setNotify.checked = settings.notify;
  setRemember.checked = settings.remember;
  setVisualizer.checked = settings.visualizer;
  setHalo.checked = settings.halo;
  setOnlineCover.checked = settings.onlineCover;
  visualizer.style.display = settings.visualizer ? 'block' : 'none';
  haloEl.style.display = settings.halo ? 'block' : 'none';
  document.body.classList.toggle('light', settings.themeLight);
}

setThemeLight.addEventListener('change', () => {
  settings.themeLight = setThemeLight.checked; saveSettings();
  document.body.classList.toggle('light', settings.themeLight);
  pushMiniState();
});
setRpc.addEventListener('change', () => { settings.rpc = setRpc.checked; saveSettings(); pushRPC(); });
setTray.addEventListener('change', () => { settings.tray = setTray.checked; saveSettings(); });
setNotify.addEventListener('change', () => { settings.notify = setNotify.checked; saveSettings(); });
setRemember.addEventListener('change', () => { settings.remember = setRemember.checked; saveSettings(); });
setVisualizer.addEventListener('change', () => {
  settings.visualizer = setVisualizer.checked; saveSettings();
  visualizer.style.display = settings.visualizer ? 'block' : 'none';
});
setHalo.addEventListener('change', () => {
  settings.halo = setHalo.checked; saveSettings();
  haloEl.style.display = settings.halo ? 'block' : 'none';
});
setOnlineCover.addEventListener('change', () => { settings.onlineCover = setOnlineCover.checked; saveSettings(); });

/* ---------- Utils ---------- */

function fmt(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
function currentTrack() { return filtered[index] || null; }

/* ---------- Halo color from cover ---------- */

function extractDominantColor(imgSrc) {
  return new Promise((resolve) => {
    if (!imgSrc) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = 32; c.height = 32;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, 32, 32);
        const data = ctx.getImageData(0, 0, 32, 32).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < data.length; i += 16) {
          r += data[i]; g += data[i+1]; b += data[i+2]; n++;
        }
        r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
        const max = Math.max(r, g, b);
        if (max < 60) resolve(null);
        else {
          const k = 200 / max;
          resolve(`rgb(${Math.min(255, Math.round(r * k))}, ${Math.min(255, Math.round(g * k))}, ${Math.min(255, Math.round(b * k))})`);
        }
      } catch (e) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = imgSrc;
  });
}

async function updateHalo(cover) {
  if (!settings.halo) return;
  const color = await extractDominantColor(cover);
  if (color) haloEl.style.setProperty('--halo-color', color);
  else haloEl.style.setProperty('--halo-color', settings.themeLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)');
}

/* ---------- Tabs ---------- */

function switchTab(tab) {
  currentTab = tab;
  tabs.forEach(x => x.classList.toggle('active', x.dataset.tab === tab));
  panelTracks.classList.toggle('hidden', tab !== 'tracks');
  panelFavorites.classList.toggle('hidden', tab !== 'favorites');
  panelPlaylists.classList.toggle('hidden', tab !== 'playlists');
  if (tab === 'playlists') loadPlaylists();
  if (tab === 'favorites') renderFavorites();
}
tabs.forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));

/* ---------- Track rendering ---------- */

function buildTrackEl(t, i, list) {
  const div = document.createElement('div');
  div.className = 'track' + (i === index ? ' active' : '');
  div.innerHTML = `<div class="t-title"></div><div class="t-artist"></div><div class="star">★</div>`;
  div.querySelector('.t-title').textContent = t.title;
  div.querySelector('.t-artist').textContent = t.artist;

  const star = div.querySelector('.star');
  star.classList.toggle('on', !!t.isFavorite);
  star.addEventListener('click', async (e) => {
    e.stopPropagation();
    const res = await window.api.toggleFavorite(t.file);
    t.isFavorite = res.isFavorite;
    favorites = res.favorites;
    const allT = tracks.find(x => x.file === t.file);
    if (allT) allT.isFavorite = res.isFavorite;
    star.classList.toggle('on', res.isFavorite);
    if (currentTab === 'favorites') renderFavorites();
  });

  div.addEventListener('click', () => {
    filtered = list.slice();
    index = list.findIndex(x => x.file === t.file);
    if (index < 0) index = 0;
    load(true);
  });
  div.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    ctxTrackFile = t.file;
    ctxFav.textContent = t.isFavorite ? '★  Убрать из избранного' : '★  В избранное';
    showCtxMenu(ctxMenu, e.clientX, e.clientY);
  });
  return div;
}

function renderList() {
  playlistEl.innerHTML = '';
  if (!filtered.length) {
    playlistEl.innerHTML = '<div class="t-artist" style="padding:12px">Пусто. Нажми «＋ Папка music».</div>';
    updateScrollbar();
    return;
  }
  filtered.forEach((t, i) => playlistEl.appendChild(buildTrackEl(t, i, filtered)));
  updateScrollbar();
}

function renderFavorites() {
  favoritesListEl.innerHTML = '';
  const favTracks = tracks.filter(t => t.isFavorite);
  if (!favTracks.length) {
    favoritesListEl.innerHTML = '<div class="t-artist" style="padding:12px">Пока ничего. Жми ★ у трека.</div>';
    return;
  }
  const cur = currentTrack();
  const baseIdx = favTracks.findIndex(t => cur && t.file === cur.file);
  favTracks.forEach((t, i) => {
    favoritesListEl.appendChild(buildTrackEl(t, baseIdx === i ? index : -1, favTracks));
  });
}

function renderPlaylists() {
  playlistsListEl.innerHTML = '';
  if (!playlists.length) {
    playlistsListEl.innerHTML = '<div class="t-artist" style="padding:12px">Пока пусто. Сохрани текущий список.</div>';
    return;
  }
  playlists.forEach(pl => {
    const div = document.createElement('div');
    div.className = 'pl-item' + (activePlaylist === pl.name ? ' active' : '');
    div.innerHTML = `<div class="t-title"></div><div class="t-artist"></div>`;
    div.querySelector('.t-title').textContent = pl.name;
    div.querySelector('.t-artist').textContent = (pl.count ?? 0) + ' треков';
    div.addEventListener('click', () => loadPlaylistInto(pl.name));
    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      ctxPlaylistName = pl.name;
      showCtxMenu(ctxMenuPl, e.clientX, e.clientY);
    });
    playlistsListEl.appendChild(div);
  });
}

async function loadPlaylists() {
  playlists = await window.api.playlistsList();
  for (const pl of playlists) {
    const data = await window.api.playlistLoad(pl.name);
    pl.count = (data.tracks || []).length;
    pl.tracks = data.tracks || [];
  }
  renderPlaylists();
}

async function loadPlaylistInto(name) {
  const data = await window.api.playlistLoad(name);
  const files = data.tracks || [];
  filtered = files.map(f => tracks.find(t => t.file === f)).filter(Boolean);
  index = 0;
  activePlaylist = name;
  if (currentTab !== 'playlists') switchTab('tracks');
  renderList();
  if (filtered.length) load(false);
}

/* ---------- Custom scrollbar ---------- */

function updateScrollbar() {
  const sh = playlistEl.scrollHeight;
  const ch = playlistEl.clientHeight;
  const rail = scrollThumb.parentElement;
  const railH = rail.clientHeight;
  if (sh <= ch) { scrollThumb.style.display = 'none'; return; }
  scrollThumb.style.display = 'block';
  const thumbH = Math.max(24, (ch / sh) * railH);
  scrollThumb.style.height = thumbH + 'px';
  const maxScroll = sh - ch, maxThumb = railH - thumbH;
  scrollThumb.style.top = ((playlistEl.scrollTop / maxScroll) * maxThumb) + 'px';
}
playlistEl.addEventListener('scroll', updateScrollbar);
window.addEventListener('resize', updateScrollbar);

let draggingScroll = false, dragStartY = 0, dragStartTop = 0;
scrollThumb.addEventListener('mousedown', (e) => {
  draggingScroll = true; dragStartY = e.clientY; dragStartTop = playlistEl.scrollTop;
  e.preventDefault();
});
window.addEventListener('mousemove', (e) => {
  if (!draggingScroll) return;
  const railH = scrollThumb.parentElement.clientHeight;
  const sh = playlistEl.scrollHeight, ch = playlistEl.clientHeight;
  const thumbH = scrollThumb.offsetHeight;
  const maxThumb = railH - thumbH, maxScroll = sh - ch;
  const dy = e.clientY - dragStartY;
  playlistEl.scrollTop = dragStartTop + (maxThumb > 0 ? dy / maxThumb : 0) * maxScroll;
});
window.addEventListener('mouseup', () => { draggingScroll = false; });

/* ---------- Cover animation ---------- */

function setCoverNow(coverSrc) {
  currentCoverEl.style.backgroundImage = coverSrc ? `url("${coverSrc}")` : '';
}

function animateCoverChange(coverSrc, fileKey) {
  if (coverAnimating || fileKey === lastFile) {
    if (fileKey === lastFile && coverSrc) currentCoverEl.style.backgroundImage = `url("${coverSrc}")`;
    return;
  }
  coverAnimating = true;

  const outgoing = currentCoverEl;
  const incoming = document.createElement('div');
  incoming.className = 'cover';
  incoming.style.backgroundImage = coverSrc ? `url("${coverSrc}")` : '';
  incoming.style.transform = 'translateY(140%) scale(.85)';
  incoming.style.opacity = '0';
  coverStack.appendChild(incoming);

  outgoing.classList.add('big-fly-out');
  incoming.classList.add('big-fly-in');

  setTimeout(() => {
    outgoing.remove();
    incoming.classList.remove('big-fly-in');
    incoming.style.transform = '';
    incoming.style.opacity = '';
    currentCoverEl = incoming;
    if (!audio.paused) incoming.classList.add('playing');
    coverAnimating = false;
    lastFile = fileKey;
  }, 520);
}

/* ---------- Load ---------- */

async function load(autoplay = false) {
  const t = currentTrack();
  if (!t) return;

  audio.src = t.url;

  metaEl.classList.add('swap');
  setTimeout(() => {
    titleEl.textContent = t.title;
    artistEl.textContent = t.artist;
    metaEl.classList.remove('swap');
  }, 150);

  let coverSrc = t.cover;
  if (!coverSrc && settings.onlineCover) {
    try {
      const res = await window.api.fetchCover({ title: t.title, artist: t.artist });
      if (res && res.ok) coverSrc = res.cover;
    } catch (e) {}
  }

  if (lastFile === null) {
    setCoverNow(coverSrc);
    lastFile = t.file;
  } else {
    animateCoverChange(coverSrc, t.file);
  }

  updateHalo(coverSrc);

  renderList();
  if (currentTab === 'favorites') renderFavorites();
  pushMiniState();
  pushRPC();
  if (autoplay) audio.play();
}

/* ---------- Controls ---------- */

playBtn.addEventListener('click', () => {
  if (!currentTrack()) return;
  if (audio.paused) audio.play(); else audio.pause();
});
prevBtn.addEventListener('click', () => {
  if (!filtered.length) return;
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  index = (index - 1 + filtered.length) % filtered.length;
  load(true);
});
nextBtn.addEventListener('click', () => {
  if (!filtered.length) return;
  index = (index + 1) % filtered.length;
  load(true);
});
shuffleBtn.addEventListener('click', () => { shuffle = !shuffle; shuffleBtn.classList.toggle('on', shuffle); });
repeatBtn.addEventListener('click', () => {
  repeatMode = (repeatMode + 1) % 3;
  repeatBtn.classList.toggle('on', repeatMode > 0);
  repeatBtn.classList.toggle('repeat-one', repeatMode === 2);
  repeatBtn.title = repeatMode === 0 ? 'Повтор выкл' : repeatMode === 1 ? 'Повтор списка' : 'Повтор одного трека';
});

/* ---------- Audio ---------- */

audio.addEventListener('play', () => {
  playBtn.textContent = '⏸';
  if (currentCoverEl) currentCoverEl.classList.add('playing');
  ensureAudioGraph();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  if (settings.notify) {
    const t = currentTrack();
    if (t) window.api.notifyTrack({ title: t.title, artist: t.artist });
  }
  pushMiniState();
  pushRPC();
});
audio.addEventListener('pause', () => {
  playBtn.textContent = '▶';
  if (currentCoverEl) currentCoverEl.classList.remove('playing');
  pushMiniState();
  pushRPC();
});
audio.addEventListener('ended', () => {
  if (repeatMode === 2) { audio.currentTime = 0; audio.play(); return; }
  if (shuffle) index = Math.floor(Math.random() * filtered.length);
  else index = (index + 1) % filtered.length;
  if (repeatMode === 0 && index === 0 && !shuffle) { audio.pause(); return; }
  load(true);
});
audio.addEventListener('loadedmetadata', () => { durEl.textContent = fmt(audio.duration); });
audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  bar.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
  curEl.textContent = fmt(audio.currentTime);
});

/* ---------- Visualizer + Halo pulse ---------- */

let audioCtx = null, analyser = null, sourceNode = null, freqData = null, rafId = null;
let bassLevel = 0;

function ensureAudioGraph() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    sourceNode = audioCtx.createMediaElementSource(audio);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    freqData = new Uint8Array(analyser.frequencyBinCount);
    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);
    drawVisualizer();
  } catch (e) { console.warn('Audio graph:', e); }
}

function drawVisualizer() {
  const ctx = visualizer.getContext('2d');
  const dpr = devicePixelRatio || 1;

  function resize() {
    visualizer.width = visualizer.clientWidth * dpr;
    visualizer.height = visualizer.clientHeight * dpr;
  }
  resize();
  window.addEventListener('resize', resize);

  const bars = 72;

  function frame() {
    rafId = requestAnimationFrame(frame);
    ctx.clearRect(0, 0, visualizer.width, visualizer.height);
    if (!analyser || !settings.visualizer) return;

    const w = visualizer.width, h = visualizer.height;
    const cx = w / 2, cy = h / 2;
    const baseR = 140 * dpr;
    const col = settings.themeLight ? '0,0,0' : '255,255,255';

    analyser.getByteFrequencyData(freqData);

    let bassSum = 0;
    for (let i = 0; i < 8; i++) bassSum += freqData[i];
    bassLevel = bassSum / (8 * 255);

    const step = Math.max(1, Math.floor(freqData.length / bars));
    for (let i = 0; i < bars; i++) {
      const v = freqData[i * step] / 255;
      const angle = (i / bars) * Math.PI * 2 - Math.PI / 2;
      const len = 6 * dpr + v * 40 * dpr;
      const x1 = cx + Math.cos(angle) * baseR;
      const y1 = cy + Math.sin(angle) * baseR;
      const x2 = cx + Math.cos(angle) * (baseR + len);
      const y2 = cy + Math.sin(angle) * (baseR + len);
      ctx.strokeStyle = `rgba(${col},${0.12 + v * 0.75})`;
      ctx.lineWidth = 2 * dpr;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
  frame();
}

setInterval(() => {
  if (!settings.halo) return;
  const scale = 1 + bassLevel * 0.15;
  haloEl.style.transform = `translate(-50%, -50%) scale(${scale})`;
}, 33);

/* ---------- Seek ---------- */

function seek(e) {
  const rect = progress.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  if (audio.duration) audio.currentTime = ratio * audio.duration;
}
progress.addEventListener('click', seek);
let draggingProgress = false;
progress.addEventListener('mousedown', (e) => { draggingProgress = true; seek(e); });
window.addEventListener('mousemove', (e) => { if (draggingProgress) seek(e); });
window.addEventListener('mouseup', () => { draggingProgress = false; });

/* ---------- Volume ---------- */

volume.addEventListener('input', () => { audio.volume = parseFloat(volume.value); updateVolIcon(); });
function updateVolIcon() {
  const v = audio.volume;
  volIcon.textContent = v === 0 ? '🔇' : v < 0.5 ? '🔉' : '🔊';
}
updateVolIcon();
volIcon.addEventListener('click', () => {
  audio.volume = audio.volume === 0 ? 1 : 0;
  volume.value = audio.volume;
  updateVolIcon();
});

/* ---------- Search ---------- */

searchInput.addEventListener('input', () => {
  const q = searchInput.value.toLowerCase().trim();
  const cur = currentTrack();
  if (!q) filtered = tracks.slice();
  else filtered = tracks.filter(t =>
    t.title.toLowerCase().includes(q) ||
    t.artist.toLowerCase().includes(q) ||
    t.album.toLowerCase().includes(q)
  );
  const curIdx = filtered.findIndex(t => cur && t.file === cur.file);
  index = curIdx >= 0 ? curIdx : 0;
  renderList();
});

/* ---------- Scan ---------- */

async function scan() {
  const cur = currentTrack();
  tracks = await window.api.scanMusic();
  favorites = await window.api.favoritesList();
  filtered = tracks.slice();
  const curIdx = filtered.findIndex(t => cur && t.file === cur.file);
  index = curIdx >= 0 ? curIdx : 0;
  renderList();
  if (currentTab === 'favorites') renderFavorites();
  if (tracks.length && !audio.src) load(false);
}
scan();

openFolderBtn.addEventListener('click', async () => {
  const res = await window.api.openMusicFolder();
  if (res && res.error) { alert('Не удалось открыть папку:\n' + res.path + '\n\n' + res.error); return; }
  await scan();
});
refreshBtn.addEventListener('click', async () => {
  refreshBtn.style.transform = 'rotate(360deg)';
  refreshBtn.style.transition = 'transform .5s';
  setTimeout(() => { refreshBtn.style.transform = ''; refreshBtn.style.transition = ''; }, 500);
  await scan();
});

/* ---------- Mini player ---------- */

miniBtn.addEventListener('click', () => {
  pushMiniState();
  window.api.miniOpen();
});

function pushMiniState() {
  const t = currentTrack();
  window.api.miniState({
    file: t ? t.file : '',
    title: t ? t.title : 'Нет трека',
    artist: t ? t.artist : '—',
    cover: t ? t.cover : null,
    paused: audio.paused,
    themeLight: settings.themeLight
  });
}

window.api.onMiniCmd((cmd) => {
  if (cmd === 'playpause') playBtn.click();
  else if (cmd === 'next') nextBtn.click();
  else if (cmd === 'prev') prevBtn.click();
});

/* ---------- Discord RPC ---------- */

let lastRpcSent = 0;
function pushRPC() {
  if (!settings.rpc) { window.api.rpcUpdate(null); return; }
  const now = Date.now();
  if (now - lastRpcSent < 2000) return;
  lastRpcSent = now;
  const t = currentTrack();
  if (!t) { window.api.rpcUpdate(null); return; }
  window.api.rpcUpdate({
    title: t.title,
    artist: t.artist,
    paused: audio.paused,
    elapsed: Math.floor(audio.currentTime || 0)
  });
}

/* ---------- Context menus ---------- */

function showCtxMenu(el, x, y) {
  hideCtxMenus();
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.classList.add('open');
}
function hideCtxMenus() {
  ctxMenu.classList.remove('open');
  ctxMenuPl.classList.remove('open');
}
document.addEventListener('click', (e) => {
  if (!ctxMenu.contains(e.target) && !ctxMenuPl.contains(e.target)) hideCtxMenus();
});
window.addEventListener('blur', hideCtxMenus);

ctxPlay.addEventListener('click', () => {
  const i = filtered.findIndex(t => t.file === ctxTrackFile);
  if (i >= 0) { index = i; load(true); }
  hideCtxMenus();
});

ctxFav.addEventListener('click', async () => {
  const res = await window.api.toggleFavorite(ctxTrackFile);
  const t = tracks.find(x => x.file === ctxTrackFile);
  if (t) t.isFavorite = res.isFavorite;
  favorites = res.favorites;
  renderList();
  if (currentTab === 'favorites') renderFavorites();
  hideCtxMenus();
});

ctxInfo.addEventListener('click', () => {
  const t = tracks.find(x => x.file === ctxTrackFile);
  if (!t) return;
  infoBody.innerHTML = '';
  const rows = [
    ['Название', t.title],
    ['Артист', t.artist],
    ['Альбом', t.album || '—'],
    ['Длительность', fmt(t.duration)],
    ['Избранное', t.isFavorite ? 'да' : 'нет'],
    ['Файл', t.file]
  ];
  for (const [label, value] of rows) {
    const row = document.createElement('div');
    row.className = 'info-row';
    row.innerHTML = `<span class="info-label"></span><span class="info-value"></span>`;
    row.querySelector('.info-label').textContent = label;
    row.querySelector('.info-value').textContent = value;
    infoBody.appendChild(row);
  }
  infoBackdrop.classList.add('open');
  hideCtxMenus();
});

ctxDelete.addEventListener('click', async () => {
  const t = tracks.find(x => x.file === ctxTrackFile);
  if (!t) return;
  if (!confirm(`Удалить файл «${t.title}» с диска?\nЭто необратимо.`)) { hideCtxMenus(); return; }
  const res = await window.api.deleteTrack(ctxTrackFile);
  if (!res.ok) { alert('Не удалось удалить: ' + res.error); hideCtxMenus(); return; }
  hideCtxMenus();
  const wasCurrent = currentTrack() && currentTrack().file === ctxTrackFile;
  await scan();
  if (wasCurrent) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    titleEl.textContent = 'Нет трека';
    artistEl.textContent = '—';
    currentCoverEl.style.backgroundImage = '';
    pushMiniState();
    pushRPC();
  }
});

ctxAddToPlaylist.addEventListener('click', () => {
  openPickPlaylist(ctxTrackFile);
  hideCtxMenus();
});

ctxPlPlay.addEventListener('click', () => { loadPlaylistInto(ctxPlaylistName); hideCtxMenus(); });
ctxPlOpenFolder.addEventListener('click', async () => { await window.api.openPlaylistsFolder(); hideCtxMenus(); });
ctxPlDelete.addEventListener('click', async () => {
  if (!confirm(`Удалить плейлист «${ctxPlaylistName}»?\nФайлы треков не тронутся.`)) { hideCtxMenus(); return; }
  await window.api.playlistDelete(ctxPlaylistName);
  if (activePlaylist === ctxPlaylistName) activePlaylist = null;
  hideCtxMenus();
  await loadPlaylists();
});

/* ---------- Info ---------- */

infoClose.addEventListener('click', () => infoBackdrop.classList.remove('open'));
infoBackdrop.addEventListener('click', (e) => { if (e.target === infoBackdrop) infoBackdrop.classList.remove('open'); });

/* ---------- Pick playlist ---------- */

let pendingFile = null;

function openPickPlaylist(file) {
  pendingFile = file;
  pickList.innerHTML = '';
  if (!playlists.length) {
    pickList.innerHTML = '<div class="t-artist" style="padding:12px">Плейлистов ещё нет. Создай ниже.</div>';
  } else {
    playlists.forEach(pl => {
      const div = document.createElement('div');
      div.className = 'pl-item';
      div.innerHTML = `<div class="t-title"></div><div class="t-artist"></div>`;
      div.querySelector('.t-title').textContent = pl.name;
      div.querySelector('.t-artist').textContent = (pl.count ?? 0) + ' треков';
      div.addEventListener('click', async () => {
        const data = await window.api.playlistLoad(pl.name);
        const list = data.tracks || [];
        if (!list.includes(pendingFile)) list.push(pendingFile);
        await window.api.playlistSave({ name: pl.name, tracks: list });
        pickPlaylistBackdrop.classList.remove('open');
        if (currentTab === 'playlists') await loadPlaylists();
      });
      pickList.appendChild(div);
    });
  }
  pickNewName.value = '';
  pickPlaylistBackdrop.classList.add('open');
}

pickClose.addEventListener('click', () => pickPlaylistBackdrop.classList.remove('open'));
pickPlaylistBackdrop.addEventListener('click', (e) => { if (e.target === pickPlaylistBackdrop) pickPlaylistBackdrop.classList.remove('open'); });

pickCreate.addEventListener('click', async () => {
  const name = pickNewName.value.trim();
  if (!name) return;
  await window.api.playlistSave({ name, tracks: pendingFile ? [pendingFile] : [] });
  pickPlaylistBackdrop.classList.remove('open');
  if (currentTab === 'playlists') await loadPlaylists();
});

/* ---------- Save playlist ---------- */

savePlaylistBtn.addEventListener('click', () => {
  savePlName.value = activePlaylist || '';
  savePlaylistBackdrop.classList.add('open');
});
savePlClose.addEventListener('click', () => savePlaylistBackdrop.classList.remove('open'));
savePlCancel.addEventListener('click', () => savePlaylistBackdrop.classList.remove('open'));
savePlaylistBackdrop.addEventListener('click', (e) => { if (e.target === savePlaylistBackdrop) savePlaylistBackdrop.classList.remove('open'); });

savePlConfirm.addEventListener('click', async () => {
  const name = savePlName.value.trim();
  if (!name) return;
  const files = filtered.map(t => t.file);
  await window.api.playlistSave({ name, tracks: files });
  savePlaylistBackdrop.classList.remove('open');
  activePlaylist = name;
  await loadPlaylists();
});

/* ---------- Settings ---------- */

function openSettings() { modalBackdrop.classList.add('open'); }
function closeSettings() { modalBackdrop.classList.remove('open'); }

settingsBtn.addEventListener('click', openSettings);
modalClose.addEventListener('click', closeSettings);
modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) closeSettings(); });
window.api.onOpenSettings(openSettings);

openFolderInSettings.addEventListener('click', async () => { await window.api.openMusicFolder(); await scan(); });
openPlaylistsInSettings.addEventListener('click', async () => { await window.api.openPlaylistsFolder(); });

autoscanBtn.addEventListener('click', async () => {
  autoscanBtn.disabled = true;
  autoscanBtn.textContent = 'Ищу...';
  autoscanResult.textContent = 'Сканирую Музыку, Загрузки, Рабочий стол, Документы...';
  try {
    const res = await window.api.autoscan();
    autoscanResult.textContent = `Найдено ${res.found}, скопировано ${res.copied} новых.`;
    await scan();
  } catch (e) {
    autoscanResult.textContent = 'Ошибка: ' + e.message;
  } finally {
    autoscanBtn.disabled = false;
    autoscanBtn.textContent = 'Найти mp3 на компьютере';
  }
});

document.querySelectorAll('[data-sleep]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const min = parseInt(btn.dataset.sleep);
    const res = await window.api.sleepTimer(min);
    sleepResult.textContent = res.active
      ? `Плеер выключится через ${res.minutes} мин.`
      : 'Таймер сна отменён.';
  });
});

minimizeBtn.addEventListener('click', () => { closeSettings(); window.api.minimizeToTray(); });
quitBtn.addEventListener('click', () => window.api.quit());

/* ---------- Wallpaper ---------- */

const wallpaperSide = document.getElementById('wallpaperSide');
const wallpaperMain = document.getElementById('wallpaperMain');
const wallpaperPick = document.getElementById('wallpaperPick');
const wallpaperRemove = document.getElementById('wallpaperRemove');
const wallpaperResult = document.getElementById('wallpaperResult');

async function loadWallpaper() {
  const res = await window.api.wallpaperGet();
  if (res && res.ok) {
    wallpaperSide.style.backgroundImage = `url("${res.url}")`;
    wallpaperMain.style.backgroundImage = `url("${res.url}")`;
    wallpaperSide.classList.add('has-wallpaper');
    wallpaperMain.classList.add('has-wallpaper');
    wallpaperResult.textContent = 'Обои установлены.';
  } else {
    wallpaperSide.style.backgroundImage = '';
    wallpaperMain.style.backgroundImage = '';
    wallpaperSide.classList.remove('has-wallpaper');
    wallpaperMain.classList.remove('has-wallpaper');
    wallpaperResult.textContent = '';
  }
}

wallpaperPick.addEventListener('click', async () => {
  const res = await window.api.wallpaperPick();
  if (res && res.ok) {
    wallpaperSide.style.backgroundImage = `url("${res.url}")`;
    wallpaperMain.style.backgroundImage = `url("${res.url}")`;
    wallpaperSide.classList.add('has-wallpaper');
    wallpaperMain.classList.add('has-wallpaper');
    wallpaperResult.textContent = 'Обои обновлены.';
  } else if (res && !res.canceled) {
    wallpaperResult.textContent = 'Ошибка: ' + (res.error || 'не удалось');
  }
});

wallpaperRemove.addEventListener('click', async () => {
  await window.api.wallpaperRemove();
  wallpaperSide.style.backgroundImage = '';
  wallpaperMain.style.backgroundImage = '';
  wallpaperSide.classList.remove('has-wallpaper');
  wallpaperMain.classList.remove('has-wallpaper');
  wallpaperResult.textContent = 'Обои убраны.';
});

loadWallpaper();
/* ---------- Media keys ---------- */

window.api.onMediaKey((key) => {
  if (key === 'playpause') playBtn.click();
  else if (key === 'next') nextBtn.click();
  else if (key === 'prev') prevBtn.click();
  else if (key === 'stop') { audio.pause(); audio.currentTime = 0; }
});

/* ---------- Remember ---------- */

window.addEventListener('beforeunload', () => {
  if (!settings.remember) return;
  const t = currentTrack();
  if (t) localStorage.setItem('lastTrack', t.file);
});

window.addEventListener('load', () => {
  applySettingsToUI();
  if (!settings.remember) return;
  const last = localStorage.getItem('lastTrack');
  if (last) {
    const i = filtered.findIndex(t => t.file === last);
    if (i >= 0) { index = i; load(false); }
  }
});

/* ---------- Hotkeys ---------- */

window.addEventListener('keydown', (e) => {
  if (e.target === searchInput || e.target === pickNewName || e.target === savePlName) return;
  if (e.code === 'Escape') {
    closeSettings();
    infoBackdrop.classList.remove('open');
    pickPlaylistBackdrop.classList.remove('open');
    savePlaylistBackdrop.classList.remove('open');
    hideCtxMenus();
    return;
  }
  if (e.code === 'Space') { e.preventDefault(); playBtn.click(); }
  if (e.code === 'ArrowRight') nextBtn.click();
  if (e.code === 'ArrowLeft') prevBtn.click();
});