// language: JavaScript, file: preload.js, runtime: Electron preload
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  scanMusic: () => ipcRenderer.invoke('scan-music'),
  openMusicFolder: () => ipcRenderer.invoke('open-music-folder'),
  deleteTrack: (file) => ipcRenderer.invoke('delete-track', file),
  autoscan: () => ipcRenderer.invoke('autoscan'),

  toggleFavorite: (file) => ipcRenderer.invoke('toggle-favorite', file),
  favoritesList: () => ipcRenderer.invoke('favorites-list'),

  playlistsList: () => ipcRenderer.invoke('playlists-list'),
  playlistLoad: (name) => ipcRenderer.invoke('playlist-load', name),
  playlistSave: (data) => ipcRenderer.invoke('playlist-save', data),
  playlistDelete: (name) => ipcRenderer.invoke('playlist-delete', name),
  openPlaylistsFolder: () => ipcRenderer.invoke('open-playlists-folder'),

  fetchCover: (data) => ipcRenderer.invoke('fetch-cover', data),

  wallpaperPick: () => ipcRenderer.invoke('wallpaper-pick'),
  wallpaperGet: () => ipcRenderer.invoke('wallpaper-get'),
  wallpaperRemove: () => ipcRenderer.invoke('wallpaper-remove'),

  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  quit: () => ipcRenderer.invoke('quit-app'),
  notifyTrack: (data) => ipcRenderer.invoke('notify-track', data),
  sleepTimer: (min) => ipcRenderer.invoke('sleep-timer', min),

  miniOpen: () => ipcRenderer.invoke('mini-open'),
  miniClose: () => ipcRenderer.invoke('mini-close'),
  miniDrag: (d) => ipcRenderer.invoke('mini-drag', d),
  miniState: (state) => ipcRenderer.send('mini-state', state),
  miniCmd: (cmd) => ipcRenderer.send('mini-cmd', cmd),
  onMiniState: (cb) => ipcRenderer.on('mini-state', (e, state) => cb(state)),
  onMiniCmd: (cb) => ipcRenderer.on('mini-cmd', (e, cmd) => cb(cmd)),

  rpcUpdate: (data) => ipcRenderer.send('rpc-update', data),

  onOpenSettings: (cb) => ipcRenderer.on('open-settings', () => cb()),
  onMediaKey: (cb) => ipcRenderer.on('media-key', (e, key) => cb(key))
});