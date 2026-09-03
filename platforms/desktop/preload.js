const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('kadrDesktop', {
  isDesktop: true,
  platform: process.platform
})
