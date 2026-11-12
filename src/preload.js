'use strict';
const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('hak', {
  desktop: true,
  loadSync: () => ipcRenderer.sendSync('db:load'),
  save: db => ipcRenderer.invoke('db:save', db),
  importPreview: (db, opts) => ipcRenderer.invoke('import:preview', db, opts),
  importApply: (db, strategy, opts) => ipcRenderer.invoke('import:apply', db, strategy, opts),
  backupTo: () => ipcRenderer.invoke('backup:to'),
  lotSave: pkg => ipcRenderer.invoke('lot:save', pkg),
  lotOpen: p => ipcRenderer.invoke('lot:open', p),
  lotApply: (pkg, action) => ipcRenderer.invoke('lot:apply', pkg, action),
  openDataFolder: () => ipcRenderer.invoke('app:openData'),
  google: {
    status: () => ipcRenderer.invoke('google:status'),
    login: () => ipcRenderer.invoke('google:login'),
    logout: () => ipcRenderer.invoke('google:logout')
  },
  lookup: {
    status: () => ipcRenderer.invoke('lookup:status'),
    setSheet: link => ipcRenderer.invoke('lookup:setSheet', link),
    sync: () => ipcRenderer.invoke('lookup:sync'),
    importExcel: p => ipcRenderer.invoke('lookup:importExcel', p),
    search: (q, tab, opts) => ipcRenderer.invoke('lookup:search', q, tab, opts),
    candidates: (tab, row) => ipcRenderer.invoke('lookup:candidates', tab, row),
    build: (cccd, hd) => ipcRenderer.invoke('lookup:build', cccd, hd)
  }
});
