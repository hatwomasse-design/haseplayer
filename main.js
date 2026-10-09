// language: JavaScript, file: main.js, runtime: Electron main process
const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, Notification, globalShortcut, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const mm = require('music-metadata');

let DiscordRPC = null;
try { DiscordRPC = require('discord-rpc'); } catch (e) { console.warn('discord-rpc not installed'); }

const DISCORD_CLIENT_ID = '1558199534985809920';
let rpc = null;
let rpcReady = false;

const BASE_DIR = app.isPackaged ? path.dirname(process.execPath) : __dirname;
const MUSIC_DIR = path.join(BASE_DIR, 'music');
const PLAYLISTS_DIR = path.join(BASE_DIR, 'playlists');
const FAVORITES_FILE = path.join(BASE_DIR, 'favorites.json');
const WALLPAPER_BASE = path.join(BASE_DIR, 'wallpaper');

let mainWindow = null;
let miniWindow = null;
let tray = null;
let isQuitting = false;
let sleepTimer = null;

function ensureDirs() {
  try {
    if (!fs.existsSync(MUSIC_DIR)) fs.mkdirSync(MUSIC_DIR, { recursive: true });
    if (!fs.existsSync(PLAYLISTS_DIR)) fs.mkdirSync(PLAYLISTS_DIR, { recursive: true });
    if (!fs.existsSync(FAVORITES_FILE)) fs.writeFileSync(FAVORITES_FILE, '[]');
    return true;
  } catch (e) { console.error(e); return false; }
}

function readFavorites() {
  try { return JSON.parse(fs.readFileSync(FAVORITES_FILE, 'utf-8')); }
  catch (e) { return []; }
}
function writeFavorites(list) {
  try { fs.writeFileSync(FAVORITES_FILE, JSON.stringify(list, null, 2)); return true; }
  catch (e) { return false; }
}

/* ---------- Wallpaper ---------- */

function findWallpaper() {
  for (const ext of ['.jpg', '.jpeg', '.png', '.webp', '.gif']) {
    const p = WALLPAPER_BASE + ext;
    if (fs.existsSync(p)) return { path: p, ext };
  }
  return null;
}

function removeWallpaper() {
  const found = findWallpaper();
  if (found) {
    try { fs.unlinkSync(found.path); } catch (e) {}
  }
}

/* ---------- Discord RPC ---------- */

function initRPC() {
  if (!DiscordRPC || !DISCORD_CLIENT_ID) return;
  try {
    rpc = new DiscordRPC.Client({ transport: 'ipc' });
    rpc.on('ready', () => { rpcReady = true; });
    rpc.login({ clientId: DISCORD_CLIENT_ID }).catch(err => {
      console.warn('Discord RPC login:', err.message);
      rpc = null;
    });
  } catch (e) { rpc = null; }
}

function setRPC(data) {
  if (!rpcReady || !rpc) return;
  try {
    if (!data || !data.title) {
      rpc.clearActivity().catch(() => {});
      return;
    }
    rpc.setActivity({
      details: String(data.title).slice(0, 128),
      state: String(data.artist || '—').slice(0, 128),
      startTimestamp: data.paused ? undefined : Date.now() - (data.elapsed || 0) * 1000,
      largeImageKey: 'logo',
      largeImageText: 'HasePlayer',
      smallImageKey: data.paused ? 'pause' : 'play',
      smallImageText: data.paused ? 'На паузе' : 'Играет',
      instance: false
    }).catch(() => {});
  } catch (e) {}
}

/* ---------- Tray ---------- */

function createTrayIcon() {
  const size = 16;
  const buf = Buffer.alloc(size * size * 4, 0);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.sqrt((x - 7.5) ** 2 + (y - 7.5) ** 2);
    if (d < 7) {
      const i = (y * size + x) * 4;
      buf[i] = 255; buf[i + 1] = 255; buf[i + 2] = 255;
      buf[i + 3] = d < 6 ? 255 : 150;
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    { label: 'Открыть HasePlayer', click: () => showMain() },
    { label: 'Мини-плеер', click: () => showMini() },
    { type: 'separator' },
    { label: 'Папка music', click: () => { ensureDirs(); shell.openPath(MUSIC_DIR); } },
    { label: 'Папка playlists', click: () => { ensureDirs(); shell.openPath(PLAYLISTS_DIR); } },
    { label: 'Настройки', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.webContents.send('open-settings'); } } },
    { type: 'separator' },
    { label: 'Выход', click: () => { isQuitting = true; app.quit(); } }
  ]);
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('HasePlayer');
  tray.setContextMenu(buildTrayMenu());
  tray.on('double-click', () => showMain());
}

/* ---------- Windows ---------- */

function showMain() {
  if (!mainWindow) return;
  if (miniWindow && miniWindow.isVisible()) miniWindow.hide();
  mainWindow.show();
  mainWindow.focus();
}

function showMini() {
  if (!miniWindow) return;
  mainWindow.hide();
  miniWindow.showInactive();
}

function createWindow() {
  const opts = {
    width: 920,
    height: 760,
    minWidth: 760,
    minHeight: 640,
    backgroundColor: '#0a0a0a',
    title: 'HasePlayer',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  };
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(__dirname, 'icon.png');
  if (fs.existsSync(iconPath)) opts.icon = iconPath;

  mainWindow = new BrowserWindow(opts);
  mainWindow.loadFile('index.html');
  mainWindow.on('close', (e) => {
    if (isQuitting) return;
    e.preventDefault();
    mainWindow.hide();
  });
}

function createMiniWindow() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(__dirname, 'icon.png');

  miniWindow = new BrowserWindow({
    width: 360,
    height: 120,
    resizable: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#0a0a0a',
    title: 'HasePlayer Mini',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  miniWindow.loadFile('mini.html');
  miniWindow.hide();
  miniWindow.on('close', (e) => {
    if (isQuitting) return;
    e.preventDefault();
    miniWindow.hide();
  });
}

/* ---------- Music ---------- */

async function readTrack(full, file, favSet) {
  let base;
  try {
    const meta = await mm.parseFile(full);
    const pic = meta.common.picture && meta.common.picture[0];
    base = {
      file,
      url: 'file://' + full.replace(/\\/g, '/').replace(/#/g, '%23'),
      title: meta.common.title || file.replace(/\.[^.]+$/, ''),
      artist: meta.common.artist || '—',
      album: meta.common.album || '',
      duration: meta.format.duration || 0,
      cover: pic ? `data:${pic.format};base64,${Buffer.from(pic.data).toString('base64')}` : null
    };
  } catch (e) {
    base = {
      file,
      url: 'file://' + full.replace(/\\/g, '/').replace(/#/g, '%23'),
      title: file.replace(/\.[^.]+$/, ''),
      artist: '—', album: '', duration: 0, cover: null
    };
  }
  base.isFavorite = favSet.has(file);
  return base;
}

ipcMain.handle('scan-music', async () => {
  ensureDirs();
  let files = [];
  try {
    files = fs.readdirSync(MUSIC_DIR).filter(f => /\.(mp3|m4a|flac|ogg|wav)$/i.test(f));
  } catch (e) { return []; }
  const favSet = new Set(readFavorites());
  const tracks = [];
  for (const file of files) tracks.push(await readTrack(path.join(MUSIC_DIR, file), file, favSet));
  return tracks;
});

ipcMain.handle('open-music-folder', async () => {
  ensureDirs();
  const err = await shell.openPath(MUSIC_DIR);
  return { path: MUSIC_DIR, error: err || null };
});

ipcMain.handle('delete-track', async (e, filename) => {
  const full = path.join(MUSIC_DIR, filename);
  try { fs.unlinkSync(full); return { ok: true }; }
  catch (err) { return { ok: false, error: err.message }; }
});

ipcMain.handle('toggle-favorite', (e, filename) => {
  ensureDirs();
  const list = readFavorites();
  const i = list.indexOf(filename);
  let isFav;
  if (i >= 0) { list.splice(i, 1); isFav = false; }
  else { list.push(filename); isFav = true; }
  writeFavorites(list);
  return { ok: true, isFavorite: isFav, favorites: list };
});

ipcMain.handle('favorites-list', () => { ensureDirs(); return readFavorites(); });

ipcMain.handle('autoscan', async () => {
  const home = os.homedir();
  const dirs = [
    path.join(home, 'Music'), path.join(home, 'Downloads'),
    path.join(home, 'Desktop'), path.join(home, 'Documents'),
    path.join(home, 'Музыка'), path.join(home, 'Загрузки'),
    path.join(home, 'Рабочий стол'), path.join(home, 'Документы')
  ];
  const found = [];
  const exts = /\.(mp3|m4a|flac|ogg|wav)$/i;
  for (const d of dirs) if (fs.existsSync(d)) walkDir(d, exts, found, 3);
  ensureDirs();
  let copied = 0;
  for (const src of found) {
    const dst = path.join(MUSIC_DIR, path.basename(src));
    if (!fs.existsSync(dst)) {
      try { fs.copyFileSync(src, dst); copied++; } catch (e) {}
    }
  }
  return { found: found.length, copied };
});

function walkDir(dir, exts, out, depth) {
  if (depth < 0) return;
  let items;
  try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name.startsWith('.') || item.name === 'node_modules') continue;
      walkDir(full, exts, out, depth - 1);
    } else if (exts.test(item.name)) out.push(full);
  }
}

/* ---------- Playlists ---------- */

ipcMain.handle('playlists-list', () => {
  ensureDirs();
  try {
    const files = fs.readdirSync(PLAYLISTS_DIR).filter(f => f.endsWith('.json'));
    return files.map(f => ({ name: f.replace(/\.json$/, ''), file: f }));
  } catch (e) { return []; }
});

ipcMain.handle('playlist-load', (e, name) => {
  const file = path.join(PLAYLISTS_DIR, name + '.json');
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
  catch (err) { return { name, tracks: [] }; }
});

ipcMain.handle('playlist-save', (e, { name, tracks }) => {
  ensureDirs();
  const file = path.join(PLAYLISTS_DIR, name + '.json');
  try {
    fs.writeFileSync(file, JSON.stringify({ name, tracks }, null, 2), 'utf-8');
    return { ok: true, file };
  } catch (err) { return { ok: false, error: err.message }; }
});

ipcMain.handle('playlist-delete', (e, name) => {
  const file = path.join(PLAYLISTS_DIR, name + '.json');
  try { fs.unlinkSync(file); return { ok: true }; }
  catch (err) { return { ok: false, error: err.message }; }
});

ipcMain.handle('open-playlists-folder', async () => {
  ensureDirs();
  const err = await shell.openPath(PLAYLISTS_DIR);
  return { path: PLAYLISTS_DIR, error: err || null };
});

/* ---------- Wallpaper IPC ---------- */

ipcMain.handle('wallpaper-pick', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Выбери обои',
    properties: ['openFile'],
    filters: [{ name: 'Изображения', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }]
  });
  if (res.canceled || !res.filePaths.length) return { ok: false, canceled: true };
  const src = res.filePaths[0];
  const ext = path.extname(src).toLowerCase() || '.jpg';

  // сносим старые обои
  removeWallpaper();

  const dst = WALLPAPER_BASE + ext;
  try {
    fs.copyFileSync(src, dst);
    return { ok: true, url: 'file://' + dst.replace(/\\/g, '/').replace(/#/g, '%23') };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('wallpaper-get', () => {
  const found = findWallpaper();
  if (!found) return { ok: false };
  return { ok: true, url: 'file://' + found.path.replace(/\\/g, '/').replace(/#/g, '%23') };
});

ipcMain.handle('wallpaper-remove', () => {
  removeWallpaper();
  return { ok: true };
});

/* ---------- Online cover ---------- */

function httpsJson(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'HasePlayer/1.0 (local)' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { resolve(null); } });
    }).on('error', () => resolve(null));
  });
}

function httpsBuffer(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'HasePlayer/1.0 (local)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsBuffer(res.headers.location).then(resolve);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', () => resolve(null));
  });
}

ipcMain.handle('fetch-cover', async (e, { title, artist }) => {
  if (!title && !artist) return { ok: false };
  try {
    let query = '';
    if (artist && title) query = `recording:"${title}" AND artist:"${artist}"`;
    else if (title) query = `recording:"${title}"`;
    else return { ok: false };

    const search = await httpsJson(
      'https://musicbrainz.org/ws/2/recording/?query=' +
      encodeURIComponent(query) + '&fmt=json&limit=1'
    );
    if (!search || !search.recordings || !search.recordings.length) return { ok: false };
    const rec = search.recordings[0];
    const release = rec.releases && rec.releases[0];
    if (!release) return { ok: false };

    const coverUrl = `https://coverartarchive.org/release/${release.id}/front-250`;
    const buf = await httpsBuffer(coverUrl);
    if (!buf || buf.length < 100) return { ok: false };

    const base64 = buf.toString('base64');
    const mime = buf[0] === 0xFF && buf[1] === 0xD8 ? 'image/jpeg'
               : buf[0] === 0x89 && buf[1] === 0x50 ? 'image/png'
               : 'image/jpeg';
    return { ok: true, cover: `data:${mime};base64,${base64}` };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

/* ---------- Misc ---------- */

ipcMain.handle('notify-track', (e, { title, artist }) => {
  if (!Notification.isSupported()) return;
  new Notification({ title, body: artist, silent: true }).show();
});
ipcMain.handle('minimize-to-tray', () => { if (mainWindow) mainWindow.hide(); });
ipcMain.handle('quit-app', () => { isQuitting = true; app.quit(); });
ipcMain.handle('sleep-timer', (e, minutes) => {
  if (sleepTimer) { clearTimeout(sleepTimer); sleepTimer = null; }
  if (!minutes || minutes <= 0) return { active: false };
  sleepTimer = setTimeout(() => { isQuitting = true; app.quit(); }, minutes * 60 * 1000);
  return { active: true, minutes };
});

/* ---------- Mini IPC ---------- */

ipcMain.handle('mini-open', () => { showMini(); });
ipcMain.handle('mini-close', () => { if (miniWindow) miniWindow.hide(); showMain(); });
ipcMain.handle('mini-drag', (e, { dx, dy }) => {
  if (!miniWindow) return;
  const [x, y] = miniWindow.getPosition();
  miniWindow.setPosition(x + dx, y + dy);
});
ipcMain.on('mini-state', (e, state) => {
  if (miniWindow && !miniWindow.isDestroyed()) miniWindow.webContents.send('mini-state', state);
});
ipcMain.on('mini-cmd', (e, cmd) => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('mini-cmd', cmd);
});
ipcMain.on('rpc-update', (e, data) => { setRPC(data); });

/* ---------- App ---------- */

app.whenReady().then(() => {
  ensureDirs();
  createWindow();
  createMiniWindow();
  createTray();
  initRPC();

  globalShortcut.register('MediaPlayPause', () => { if (mainWindow) mainWindow.webContents.send('media-key', 'playpause'); });
  globalShortcut.register('MediaNextTrack', () => { if (mainWindow) mainWindow.webContents.send('media-key', 'next'); });
  globalShortcut.register('MediaPreviousTrack', () => { if (mainWindow) mainWindow.webContents.send('media-key', 'prev'); });
  globalShortcut.register('MediaStop', () => { if (mainWindow) mainWindow.webContents.send('media-key', 'stop'); });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (rpc) { try { rpc.destroy(); } catch (e) {} }
});
app.on('before-quit', () => { isQuitting = true; });
app.on('window-all-closed', () => {});