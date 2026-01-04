const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),
  saveData: (data) => ipcRenderer.invoke('storage:save', data),
  loadData: () => ipcRenderer.invoke('storage:load'),
  getAudioMetadata: (filePath) => ipcRenderer.invoke('audio:metadata', filePath)
});