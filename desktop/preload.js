const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('player', {
  onScreen: (callback) => {
    const listener = (_event, snapshot) => callback(snapshot)
    ipcRenderer.on('screen:update', listener)
    return () => ipcRenderer.removeListener('screen:update', listener)
  },
  submit: (payload) => ipcRenderer.invoke('overlay:submit', payload),
  cancel: () => ipcRenderer.send('overlay:cancel'),
  reset: () => ipcRenderer.send('player:reset'),
  quit: () => ipcRenderer.send('player:quit'),
  actions: () => ipcRenderer.send('player:actions'),
  dismissActions: () => ipcRenderer.send('player:dismiss-actions'),
  fullscreen: () => ipcRenderer.send('player:fullscreen'),
  onActions: (callback) => ipcRenderer.on('player:actions', callback),
  onShow: (callback) => ipcRenderer.on('overlay:show', (_event, state) => callback(state)),
})
