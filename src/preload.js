'use strict';
const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('hak', {
  desktop: true,
  loadSync: () => ipcRenderer.sendSync('db:load'),
  save: (db, opts) => ipcRenderer.invoke('db:save', db, opts && typeof opts === 'object' ? {allowBulkDelete: !!opts.allowBulkDelete} : undefined),
  importPreview: (db, opts) => ipcRenderer.invoke('import:preview', db, opts),
  importApply: (db, strategy, opts) => ipcRenderer.invoke('import:apply', db, strategy, opts),
  backupTo: () => ipcRenderer.invoke('backup:to'),
  lotSave: pkg => ipcRenderer.invoke('lot:save', pkg),
  lotOpen: p => ipcRenderer.invoke('lot:open', p),
  lotApply: (pkg, action) => ipcRenderer.invoke('lot:apply', pkg, action),
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    setData: reset => ipcRenderer.invoke('settings:setData', !!reset),
    setBackup: reset => ipcRenderer.invoke('settings:setBackup', !!reset),
    setRemind: d => ipcRenderer.invoke('settings:setRemind', d),
    setAutoKeep: n => ipcRenderer.invoke('settings:setAutoKeep', n),
    openBackup: () => ipcRenderer.invoke('settings:openBackup')
  },
  data: {
    status: () => ipcRenderer.invoke('data:status'),
    retry: () => ipcRenderer.invoke('data:retry'),
    pickOther: () => ipcRenderer.invoke('data:pickOther'),
    useDefault: () => ipcRenderer.invoke('data:useDefault')
  },
  openDataFolder: () => ipcRenderer.invoke('app:openData'),
  phieuCan: (rows, company) => ipcRenderer.invoke('phieucan:open', rows, company),
  google: {
    status: () => ipcRenderer.invoke('google:status'),
    login: () => ipcRenderer.invoke('google:login'),
    logout: () => ipcRenderer.invoke('google:logout')
  },
  lookup: {
    status: () => ipcRenderer.invoke('lookup:status'),
    audit: () => ipcRenderer.invoke('lookup:audit'),
    setSheet: link => ipcRenderer.invoke('lookup:setSheet', link),
    sync: () => ipcRenderer.invoke('lookup:sync'),
    confirmTabs: choices => ipcRenderer.invoke('lookup:confirmTabs', choices),
    template: () => ipcRenderer.invoke('lookup:template'),
    cancelTabs: () => ipcRenderer.invoke('lookup:cancelTabs'),
    importExcel: p => ipcRenderer.invoke('lookup:importExcel', p),
    search: (q, tab, opts) => ipcRenderer.invoke('lookup:search', q, tab, opts),
    candidates: (tab, row) => ipcRenderer.invoke('lookup:candidates', tab, row),
    build: (cccd, hd) => ipcRenderer.invoke('lookup:build', cccd, hd)
  }
});
