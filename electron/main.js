const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For simplicity in this local-first app
      webSecurity: false // Allow loading local media files via file:// protocol easily
    },
    backgroundColor: '#0f172a',
    titleBarStyle: 'hiddenInset' // Native look for macOS
  });

  // Remove menu bar for cleaner look on Windows/Linux
  win.setMenuBarVisibility(false);

  // Load the built React app
  // In development, you might want to load 'http://localhost:5173'
  // But for the packaged app, we load the file.
  win.loadFile(path.join(__dirname, '../dist/index.html'));
  
  // Open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    require('shell').openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});